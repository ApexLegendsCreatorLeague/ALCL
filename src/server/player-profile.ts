import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseServiceRoleKey } from "@/lib/supabase/env";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { topLegendsFromProfile } from "@/lib/apex-legends";
import type { PlayerSocialLinks } from "@/lib/social-links";
import { formatPlatform } from "@/server/public-directory";
import { normalizePlayerName } from "@/server/liveapi-player-match";

export type PlayerCareerStats = {
  matchesPlayed: number;
  kills: number;
  assists: number;
  knocks: number;
  damage: number;
  avgKills: number;
  avgDamage: number;
  bestPlacement: number | null;
  avgPlacement: number | null;
  wins: number;
  top5: number;
  tournamentsEntered: number;
};

export type PlayerMatchRow = {
  matchId: string;
  matchLabel: string;
  map: string | null;
  tournamentName: string | null;
  eventName: string | null;
  teamName: string | null;
  placement: number | null;
  kills: number;
  assists: number;
  damage: number;
  knocks: number;
  playedAt: string | null;
};

export type PlayerTournamentRow = {
  tournamentId: string;
  name: string;
  teamName: string;
  status: string;
};

export type PlayerRecruitment = {
  lookingForTeam: boolean;
  topLegends: [string | null, string | null, string | null];
  availability: string | null;
  recruitmentPitch: string | null;
};

export type PlayerProfile = {
  playerId: string;
  profileId: string;
  displayName: string;
  username: string | null;
  platform: string | null;
  rank: string | null;
  rankVerifiedAt: string | null;
  apexTag: string | null;
  bio: string | null;
  recruitment: PlayerRecruitment;
  countryCode: string | null;
  teamId: string | null;
  teamName: string | null;
  memberSince: string;
  stats: PlayerCareerStats;
  recentMatches: PlayerMatchRow[];
  tournaments: PlayerTournamentRow[];
} & PlayerSocialLinks;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROFILE_SELECT_FULL =
  "display_name, username, bio, youtube_url, x_url, tiktok_url, instagram_url, twitch_url, kick_url, looking_for_team, main_legend_1, main_legend_2, main_legend_3, availability, recruitment_pitch, country_code, is_active, created_at";

const PROFILE_SELECT_CORE =
  "display_name, username, bio, country_code, is_active, created_at";

type ProfileRow = {
  display_name: string;
  username: string | null;
  bio: string | null;
  youtube_url?: string | null;
  x_url?: string | null;
  tiktok_url?: string | null;
  instagram_url?: string | null;
  twitch_url?: string | null;
  kick_url?: string | null;
  looking_for_team?: boolean;
  main_legend_1?: string | null;
  main_legend_2?: string | null;
  main_legend_3?: string | null;
  availability?: string | null;
  recruitment_pitch?: string | null;
  country_code: string | null;
  is_active: boolean;
  created_at: string;
};

async function fetchActiveProfile(admin: NonNullable<ReturnType<typeof adminOrNull>>, profileId: string) {
  const full = await admin
    .from("profiles")
    .select(PROFILE_SELECT_FULL)
    .eq("id", profileId)
    .eq("is_active", true)
    .maybeSingle();

  if (!full.error && full.data) {
    return full.data as ProfileRow;
  }

  const core = await admin
    .from("profiles")
    .select(PROFILE_SELECT_CORE)
    .eq("id", profileId)
    .eq("is_active", true)
    .maybeSingle();

  if (core.error || !core.data) {
    return null;
  }

  return core.data as ProfileRow;
}

function adminOrNull() {
  if (!isSupabaseConfigured() || !supabaseServiceRoleKey()) {
    return null;
  }
  return createAdminClient();
}

function emptyStats(): PlayerCareerStats {
  return {
    matchesPlayed: 0,
    kills: 0,
    assists: 0,
    knocks: 0,
    damage: 0,
    avgKills: 0,
    avgDamage: 0,
    bestPlacement: null,
    avgPlacement: null,
    wins: 0,
    top5: 0,
    tournamentsEntered: 0,
  };
}

async function resolvePlayerId(ref: string) {
  const admin = adminOrNull();
  if (!admin) {
    return null;
  }

  if (UUID_PATTERN.test(ref)) {
    const { data: byPlayerId } = await admin
      .from("players")
      .select("id")
      .eq("id", ref)
      .maybeSingle();
    if (byPlayerId) {
      return byPlayerId.id;
    }

    const { data: byProfileId } = await admin
      .from("players")
      .select("id")
      .eq("profile_id", ref)
      .maybeSingle();
    if (byProfileId) {
      return byProfileId.id;
    }

    return null;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", ref)
    .maybeSingle();
  if (!profile) {
    return null;
  }

  const { data: player } = await admin
    .from("players")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  return player?.id ?? null;
}

export async function getPlayerProfile(ref: string): Promise<PlayerProfile | null> {
  const admin = adminOrNull();
  if (!admin) {
    return null;
  }

  const playerId = await resolvePlayerId(ref);
  if (!playerId) {
    return null;
  }

  const { data: player } = await admin
    .from("players")
    .select("id, profile_id, platform, rank, apex_tag, rank_verified_at, country_code, created_at")
    .eq("id", playerId)
    .maybeSingle();

  if (!player) {
    return null;
  }

  const profile = await fetchActiveProfile(admin, player.profile_id);

  if (!profile) {
    return null;
  }

  const { data: membership } = await admin
    .from("team_players")
    .select("team_id, joined_at")
    .eq("player_id", player.id)
    .is("left_at", null)
    .maybeSingle();

  let teamId: string | null = null;
  let teamName: string | null = null;
  if (membership?.team_id) {
    teamId = membership.team_id;
    const { data: team } = await admin
      .from("teams")
      .select("name")
      .eq("id", membership.team_id)
      .maybeSingle();
    teamName = team?.name ?? null;
  }

  const [{ data: resultRowsById }, { data: resultRowsByName }] = await Promise.all([
    admin
      .from("match_player_results")
      .select(
        "match_id, team_id, player_id, source_player_name, kills, assists, damage, knocks, verified_at, created_at",
      )
      .eq("player_id", player.id)
      .not("verified_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("match_player_results")
      .select(
        "match_id, team_id, player_id, source_player_name, kills, assists, damage, knocks, verified_at, created_at",
      )
      .is("player_id", null)
      .not("verified_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const normalizedDisplayName = normalizePlayerName(profile.display_name);
  const seen = new Set<string>();
  const verifiedResults = [...(resultRowsById ?? []), ...(resultRowsByName ?? [])]
    .filter((row) => {
      if (row.player_id === player.id) return true;
      return normalizePlayerName(row.source_player_name) === normalizedDisplayName;
    })
    .filter((row) => {
      const key = `${row.match_id}:${row.source_player_name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 50);
  const matchIds = [...new Set(verifiedResults.map((row) => row.match_id))];

  const [{ data: matches }, { data: matchPlayers }] = await Promise.all([
    matchIds.length
      ? admin
          .from("matches")
          .select("id, sequence, map_name, starts_at, event_id")
          .in("id", matchIds)
      : Promise.resolve({ data: [] as { id: string; sequence: number; map_name: string | null; starts_at: string | null; event_id: string }[] }),
    matchIds.length
      ? admin
          .from("match_players")
          .select("match_id, team_id")
          .eq("player_id", player.id)
          .in("match_id", matchIds)
      : Promise.resolve({ data: [] as { match_id: string; team_id: string }[] }),
  ]);

  const teamIdByMatch = new Map(
    (matchPlayers ?? []).map((row) => [row.match_id, row.team_id]),
  );

  const teamIdsForResults = [
    ...new Set(
      verifiedResults.map((row) => row.team_id ?? teamIdByMatch.get(row.match_id)).filter(Boolean),
    ),
  ] as string[];

  const [{ data: teamResults }, { data: teams }] = await Promise.all([
    matchIds.length && teamIdsForResults.length
      ? admin
          .from("match_results")
          .select("match_id, team_id, placement, verified_at")
          .in("match_id", matchIds)
          .in("team_id", teamIdsForResults)
          .not("verified_at", "is", null)
      : Promise.resolve({ data: [] as { match_id: string; team_id: string; placement: number; verified_at: string | null }[] }),
    teamIdsForResults.length
      ? admin.from("teams").select("id, name").in("id", teamIdsForResults)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const teamNameById = new Map((teams ?? []).map((team) => [team.id, team.name]));
  const placementByMatchTeam = new Map(
    (teamResults ?? []).map((row) => [`${row.match_id}:${row.team_id}`, row.placement]),
  );

  const eventIds = [...new Set((matches ?? []).map((match) => match.event_id))];
  const { data: events } = eventIds.length
    ? await admin.from("events").select("id, name, tournament_id").in("id", eventIds)
    : { data: [] as { id: string; name: string; tournament_id: string }[] };

  const tournamentIds = [...new Set((events ?? []).map((event) => event.tournament_id))];
  const { data: tournamentsMeta } = tournamentIds.length
    ? await admin.from("tournaments").select("id, name").in("id", tournamentIds)
    : { data: [] as { id: string; name: string }[] };

  const eventById = new Map((events ?? []).map((event) => [event.id, event]));
  const tournamentById = new Map((tournamentsMeta ?? []).map((row) => [row.id, row.name]));
  const matchById = new Map((matches ?? []).map((match) => [match.id, match]));

  let kills = 0;
  let assists = 0;
  let knocks = 0;
  let damage = 0;
  const placements: number[] = [];
  let wins = 0;
  let top5 = 0;

  const recentMatches: PlayerMatchRow[] = verifiedResults.map((row) => {
    kills += row.kills;
    assists += row.assists;
    knocks += row.knocks;
    damage += row.damage;

    const match = matchById.get(row.match_id);
    const event = match ? eventById.get(match.event_id) : undefined;
    const resolvedTeamId = row.team_id ?? teamIdByMatch.get(row.match_id) ?? null;
    const placement =
      resolvedTeamId != null
        ? (placementByMatchTeam.get(`${row.match_id}:${resolvedTeamId}`) ?? null)
        : null;

    if (placement != null) {
      placements.push(placement);
      if (placement === 1) wins += 1;
      if (placement <= 5) top5 += 1;
    }

    return {
      matchId: row.match_id,
      matchLabel: match ? `Match ${match.sequence}` : "Match",
      map: match?.map_name ?? null,
      tournamentName: event ? (tournamentById.get(event.tournament_id) ?? null) : null,
      eventName: event?.name ?? null,
      teamName: resolvedTeamId ? (teamNameById.get(resolvedTeamId) ?? teamName) : teamName,
      placement,
      kills: row.kills,
      assists: row.assists,
      damage: row.damage,
      knocks: row.knocks,
      playedAt: match?.starts_at ?? row.created_at,
    };
  });

  const matchesPlayed = verifiedResults.length;
  const avgPlacement =
    placements.length > 0
      ? Math.round((placements.reduce((sum, value) => sum + value, 0) / placements.length) * 10) / 10
      : null;

  let tournaments: PlayerTournamentRow[] = [];
  if (teamId) {
    const { data: registrations } = await admin
      .from("registrations")
      .select("tournament_id, status")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(20);

    const registrationTournamentIds = [
      ...new Set((registrations ?? []).map((row) => row.tournament_id)),
    ];
    const { data: registrationTournaments } = registrationTournamentIds.length
      ? await admin.from("tournaments").select("id, name").in("id", registrationTournamentIds)
      : { data: [] as { id: string; name: string }[] };

    const registrationNameById = new Map(
      (registrationTournaments ?? []).map((row) => [row.id, row.name]),
    );

    tournaments = (registrations ?? []).map((row) => ({
      tournamentId: row.tournament_id,
      name: registrationNameById.get(row.tournament_id) ?? "Tournament",
      teamName: teamName ?? "Team",
      status: row.status,
    }));
  }

  return {
    playerId: player.id,
    profileId: player.profile_id,
    displayName: profile.display_name,
    username: profile.username,
    platform: formatPlatform(player.platform),
    rank: player.rank,
    rankVerifiedAt: player.rank_verified_at,
    apexTag: player.apex_tag,
    bio: profile.bio,
    recruitment: {
      lookingForTeam: profile.looking_for_team ?? false,
      topLegends: topLegendsFromProfile(profile),
      availability: profile.availability ?? null,
      recruitmentPitch: profile.recruitment_pitch ?? null,
    },
    youtubeUrl: profile.youtube_url ?? null,
    xUrl: profile.x_url ?? null,
    tiktokUrl: profile.tiktok_url ?? null,
    instagramUrl: profile.instagram_url ?? null,
    twitchUrl: profile.twitch_url ?? null,
    kickUrl: profile.kick_url ?? null,
    countryCode: player.country_code ?? profile.country_code,
    teamId,
    teamName,
    memberSince: membership?.joined_at ?? profile.created_at ?? player.created_at,
    stats: {
      matchesPlayed,
      kills,
      assists,
      knocks,
      damage,
      avgKills: matchesPlayed ? Math.round((kills / matchesPlayed) * 10) / 10 : 0,
      avgDamage: matchesPlayed ? Math.round(damage / matchesPlayed) : 0,
      bestPlacement: placements.length ? Math.min(...placements) : null,
      avgPlacement,
      wins,
      top5,
      tournamentsEntered: tournaments.length,
    },
    recentMatches,
    tournaments,
  };
}
