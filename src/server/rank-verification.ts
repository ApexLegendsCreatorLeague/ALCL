import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isValidApexTag,
  normalizeApexRankName,
  normalizeApexTag,
  rankMeetsMinimum,
  type CompetitionRank,
} from "@/lib/apex-rank";
import {
  fetchVerifiedApexRank,
  fetchVerifiedApexRankByUid,
  type DbPlatform,
  RankProviderError,
} from "@/server/rank-provider";
import type { Database } from "@/types/database";

type DbClient = SupabaseClient<Database>;

export type PlayerVerificationRow = {
  playerId: string;
  displayName: string;
  platform: DbPlatform | null;
  apexUid: string | null;
  apexTag: string | null;
  rank: string | null;
  rankVerifiedAt: string | null;
};

export type RosterVerificationStatus = {
  playerId: string;
  displayName: string;
  verified: boolean;
  rank: string | null;
  apexTag: string | null;
  message: string | null;
};

const MINIMUM_REGISTRATION_RANK: CompetitionRank = "Platinum";

export async function loadPlayersForVerification(
  supabase: DbClient,
  playerIds: readonly string[],
): Promise<PlayerVerificationRow[]> {
  if (!playerIds.length) return [];

  const { data: players, error } = await supabase
    .from("players")
    .select(
      "id, platform, rank, apex_uid, apex_tag, rank_verified_at, profiles ( display_name )",
    )
    .in("id", [...playerIds]);

  if (error) {
    throw new Error(error.message ?? "Player verification data could not be loaded.");
  }

  return (players ?? []).map((player) => {
    const profile = Array.isArray(player.profiles) ? player.profiles[0] : player.profiles;
    return {
      playerId: player.id,
      displayName: profile?.display_name ?? "Player",
      platform: (player.platform as DbPlatform | null) ?? null,
      apexUid: player.apex_uid,
      apexTag: player.apex_tag,
      rank: player.rank,
      rankVerifiedAt: player.rank_verified_at,
    };
  });
}

export function evaluateRosterVerification(
  players: readonly PlayerVerificationRow[],
  teamTag: string,
): RosterVerificationStatus[] {
  const normalizedTeamTag = normalizeApexTag(teamTag);

  return players.map((player) => {
    if (!isValidApexTag(normalizedTeamTag)) {
      return {
        playerId: player.playerId,
        displayName: player.displayName,
        verified: false,
        rank: player.rank,
        apexTag: player.apexTag,
        message: "Enter a valid 3-4 character team Tag.",
      };
    }

    if (!player.rankVerifiedAt || !player.apexUid) {
      return {
        playerId: player.playerId,
        displayName: player.displayName,
        verified: false,
        rank: player.rank,
        apexTag: player.apexTag,
        message: `Set Apex Tag "${normalizedTeamTag}" in-game, then verify rank on the player dashboard.`,
      };
    }

    if (player.apexTag !== normalizedTeamTag) {
      return {
        playerId: player.playerId,
        displayName: player.displayName,
        verified: false,
        rank: player.rank,
        apexTag: player.apexTag,
        message: `Verified with tag "${player.apexTag ?? "-"}" — re-verify using team tag "${normalizedTeamTag}".`,
      };
    }

    const normalizedRank = normalizeApexRankName(player.rank);
    if (!normalizedRank || !rankMeetsMinimum(normalizedRank, MINIMUM_REGISTRATION_RANK)) {
      return {
        playerId: player.playerId,
        displayName: player.displayName,
        verified: false,
        rank: player.rank,
        apexTag: player.apexTag,
        message: `Minimum verified rank for registration is ${MINIMUM_REGISTRATION_RANK}.`,
      };
    }

    return {
      playerId: player.playerId,
      displayName: player.displayName,
      verified: true,
      rank: player.rank,
      apexTag: player.apexTag,
      message: null,
    };
  });
}

export async function verifyPlayerRankWithTeamTag(
  supabase: DbClient,
  playerId: string,
  profileId: string,
  teamTag: string,
) {
  const normalizedTag = normalizeApexTag(teamTag);
  if (!isValidApexTag(normalizedTag)) {
    throw new RankProviderError("UPSTREAM", "Team Tag must be 3-4 letters or numbers.");
  }

  const [{ data: profile }, { data: player }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", profileId).single(),
    supabase
      .from("players")
      .select("id, platform, apex_uid")
      .eq("id", playerId)
      .eq("profile_id", profileId)
      .single(),
  ]);

  if (!profile?.display_name || !player) {
    throw new RankProviderError("NOT_FOUND", "Player profile not found.");
  }

  const platform = (player.platform as DbPlatform | null) ?? "pc";
  const verified = player.apex_uid
    ? await fetchVerifiedApexRankByUid(player.apex_uid, platform)
    : await fetchVerifiedApexRank(profile.display_name, platform);

  if (!rankMeetsMinimum(verified.rank, MINIMUM_REGISTRATION_RANK)) {
    throw new RankProviderError(
      "INVALID_RANK",
      `Verified rank is ${verified.rank}. Minimum rank for ALCL registration is ${MINIMUM_REGISTRATION_RANK}.`,
    );
  }

  const capturedAt = new Date().toISOString();
  const { error } = await supabase
    .from("players")
    .update({
      apex_uid: verified.uid,
      apex_tag: normalizedTag,
      rank: verified.rank,
      rank_captured_at: capturedAt,
      rank_verified_at: capturedAt,
      rank_verification_source: "apex_stats_api",
    })
    .eq("id", playerId);

  if (error) {
    throw new Error(error.message ?? "Verified rank could not be saved.");
  }

  return {
    uid: verified.uid,
    rank: verified.rank,
    apexTag: normalizedTag,
    verifiedAt: capturedAt,
    apexName: verified.name,
  };
}

export async function refreshVerifiedRanksForRoster(
  supabase: DbClient,
  playerIds: readonly string[],
  teamTag: string,
) {
  const normalizedTeamTag = normalizeApexTag(teamTag);
  if (!isValidApexTag(normalizedTeamTag)) {
    throw new Error("Team Tag must be 3-4 letters or numbers.");
  }

  const players = await loadPlayersForVerification(supabase, playerIds);
  const statuses = evaluateRosterVerification(players, normalizedTeamTag);
  const blocked = statuses.find((status) => !status.verified);
  if (blocked) {
    throw new Error(blocked.message ?? `${blocked.displayName} is not verified for this team Tag.`);
  }

  const refreshed: Array<{ playerId: string; rank: CompetitionRank; uid: string; snapshot: Record<string, unknown> }> =
    [];

  for (const player of players) {
    if (!player.platform || !player.apexUid) {
      throw new Error(`${player.displayName} is missing verified Apex account data.`);
    }

    const verified = await fetchVerifiedApexRankByUid(player.apexUid, player.platform);
    if (!rankMeetsMinimum(verified.rank, MINIMUM_REGISTRATION_RANK)) {
      throw new Error(
        `${player.displayName} is ${verified.rank}. Minimum rank for registration is ${MINIMUM_REGISTRATION_RANK}.`,
      );
    }

    const capturedAt = new Date().toISOString();
    const { error } = await supabase
      .from("players")
      .update({
        rank: verified.rank,
        rank_captured_at: capturedAt,
        rank_verified_at: capturedAt,
        apex_tag: normalizedTeamTag,
      })
      .eq("id", player.playerId);

    if (error) {
      throw new Error(error.message ?? `Could not refresh rank for ${player.displayName}.`);
    }

    refreshed.push({
      playerId: player.playerId,
      rank: verified.rank,
      uid: verified.uid,
      snapshot: {
        uid: verified.uid,
        apexName: verified.name,
        teamTag: normalizedTeamTag,
        rank: verified.rank,
        source: "apex_stats_api",
        capturedAt,
      },
    });
  }

  return refreshed;
}

export async function insertRankSnapshots(
  supabase: DbClient,
  tournamentId: string,
  entries: Array<{ playerId: string; rank: string; snapshot: Record<string, unknown> }>,
) {
  if (!entries.length) return;

  const capturedAt = new Date().toISOString();
  const rows = entries.map((entry) => ({
    tournament_id: tournamentId,
    player_id: entry.playerId,
    team_id: null,
    rank: entry.rank,
    source: "apex_stats_api",
    captured_at: capturedAt,
    snapshot: entry.snapshot,
    content_hash: "",
  }));

  const { error } = await supabase.from("rank_snapshots").insert(rows);
  if (error) {
    throw new Error(error.message ?? "Rank snapshots could not be saved.");
  }
}
