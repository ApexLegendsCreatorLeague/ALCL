import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function normalizePlayerName(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

export type TeamPlayerNameMap = Map<string, Map<string, string>>;

export async function buildTeamPlayerNameMaps(
  admin: SupabaseClient<Database>,
  matchId: string,
  teamIds: string[],
): Promise<TeamPlayerNameMap> {
  const maps: TeamPlayerNameMap = new Map();
  if (!teamIds.length) return maps;

  for (const teamId of teamIds) {
    maps.set(teamId, new Map());
  }

  const { data: lineup } = await admin
    .from("match_players")
    .select("player_id, team_id")
    .eq("match_id", matchId)
    .in("team_id", teamIds);

  const rosterByTeam = new Map<string, Set<string>>();
  for (const teamId of teamIds) {
    rosterByTeam.set(teamId, new Set());
  }

  for (const row of lineup ?? []) {
    rosterByTeam.get(row.team_id)?.add(row.player_id);
  }

  for (const teamId of teamIds) {
    if ((rosterByTeam.get(teamId)?.size ?? 0) > 0) continue;
    const { data: members } = await admin
      .from("team_players")
      .select("player_id")
      .eq("team_id", teamId)
      .is("left_at", null);
    for (const member of members ?? []) {
      rosterByTeam.get(teamId)?.add(member.player_id);
    }
  }

  const allPlayerIds = [...new Set([...rosterByTeam.values()].flatMap((ids) => [...ids]))];
  if (!allPlayerIds.length) return maps;

  const { data: players } = await admin
    .from("players")
    .select("id, profiles ( display_name )")
    .in("id", allPlayerIds);

  const nameByPlayerId = new Map<string, string>();
  for (const player of players ?? []) {
    const profile = Array.isArray(player.profiles) ? player.profiles[0] : player.profiles;
    if (profile?.display_name) {
      nameByPlayerId.set(player.id, normalizePlayerName(profile.display_name));
    }
  }

  for (const [teamId, playerIds] of rosterByTeam.entries()) {
    const teamMap = maps.get(teamId)!;
    for (const playerId of playerIds) {
      const normalized = nameByPlayerId.get(playerId);
      if (normalized) {
        teamMap.set(normalized, playerId);
      }
    }
  }

  return maps;
}

export function resolvePlayerIdForTeam(
  maps: TeamPlayerNameMap,
  teamId: string,
  sourcePlayerName: string,
): string | null {
  return maps.get(teamId)?.get(normalizePlayerName(sourcePlayerName)) ?? null;
}
