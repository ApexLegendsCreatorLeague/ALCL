import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseServiceRoleKey } from "@/lib/supabase/env";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type PublicPlayer = {
  playerId: string;
  profileId: string;
  displayName: string;
  username: string | null;
  platform: string | null;
  rank: string | null;
  teamName: string | null;
};

export type PublicTeam = {
  teamId: string;
  name: string;
  shortName: string;
  slug: string;
  captainName: string | null;
  memberCount: number;
};

function formatPlatform(platform: string | null) {
  if (!platform) return null;
  const labels: Record<string, string> = {
    pc: "PC",
    playstation: "PlayStation",
    xbox: "Xbox",
    switch: "Nintendo Switch",
  };
  return labels[platform] ?? platform;
}

function adminOrNull() {
  if (!isSupabaseConfigured() || !supabaseServiceRoleKey()) {
    return null;
  }
  return createAdminClient();
}

export async function listPublicPlayers(limit = 100): Promise<PublicPlayer[]> {
  const admin = adminOrNull();
  if (!admin) {
    return [];
  }

  const { data: players, error } = await admin
    .from("players")
    .select("id, profile_id, platform, rank, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !players?.length) {
    return [];
  }

  const profileIds = [...new Set(players.map((player) => player.profile_id))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name, username, is_active")
    .in("id", profileIds)
    .eq("is_active", true);

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );

  const activePlayers = players.filter((player) => profileById.has(player.profile_id));
  if (!activePlayers.length) {
    return [];
  }

  const { data: memberships } = await admin
    .from("team_players")
    .select("player_id, team_id")
    .is("left_at", null)
    .in(
      "player_id",
      activePlayers.map((player) => player.id),
    );

  const teamIds = [...new Set((memberships ?? []).map((row) => row.team_id))];
  const { data: teams } = teamIds.length
    ? await admin.from("teams").select("id, name").in("id", teamIds)
    : { data: [] as { id: string; name: string }[] };

  const teamNameById = new Map((teams ?? []).map((team) => [team.id, team.name]));
  const teamByPlayerId = new Map<string, string>();
  for (const row of memberships ?? []) {
    const name = teamNameById.get(row.team_id);
    if (name) {
      teamByPlayerId.set(row.player_id, name);
    }
  }

  return activePlayers.map((player) => {
    const profile = profileById.get(player.profile_id)!;
    return {
      playerId: player.id,
      profileId: player.profile_id,
      displayName: profile.display_name,
      username: profile.username,
      platform: formatPlatform(player.platform),
      rank: player.rank,
      teamName: teamByPlayerId.get(player.id) ?? null,
    };
  });
}

export async function getPublicPlayer(playerId: string): Promise<PublicPlayer | null> {
  const admin = adminOrNull();
  if (!admin) {
    return null;
  }

  const { data: player, error } = await admin
    .from("players")
    .select("id, profile_id, platform, rank")
    .eq("id", playerId)
    .maybeSingle();

  if (error || !player) {
    return null;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, username, is_active")
    .eq("id", player.profile_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  const { data: membership } = await admin
    .from("team_players")
    .select("team_id")
    .eq("player_id", player.id)
    .is("left_at", null)
    .maybeSingle();

  let teamName: string | null = null;
  if (membership?.team_id) {
    const { data: team } = await admin
      .from("teams")
      .select("name")
      .eq("id", membership.team_id)
      .maybeSingle();
    teamName = team?.name ?? null;
  }

  return {
    playerId: player.id,
    profileId: player.profile_id,
    displayName: profile.display_name,
    username: profile.username,
    platform: formatPlatform(player.platform),
    rank: player.rank,
    teamName,
  };
}

export async function listPublicTeams(limit = 100): Promise<PublicTeam[]> {
  const admin = adminOrNull();
  if (!admin) {
    return [];
  }

  const { data: teams, error } = await admin
    .from("teams")
    .select("id, name, short_name, slug, captain_id, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !teams?.length) {
    return [];
  }

  const captainIds = [...new Set(teams.map((team) => team.captain_id).filter(Boolean))] as string[];
  const { data: captains } = captainIds.length
    ? await admin.from("profiles").select("id, display_name").in("id", captainIds)
    : { data: [] as { id: string; display_name: string }[] };

  const captainById = new Map((captains ?? []).map((profile) => [profile.id, profile.display_name]));

  const teamIds = teams.map((team) => team.id);
  const { data: counts } = await admin
    .from("team_players")
    .select("team_id")
    .is("left_at", null)
    .in("team_id", teamIds);

  const memberCount = new Map<string, number>();
  for (const row of counts ?? []) {
    memberCount.set(row.team_id, (memberCount.get(row.team_id) ?? 0) + 1);
  }

  return teams.map((team) => ({
    teamId: team.id,
    name: team.name,
    shortName: team.short_name,
    slug: team.slug,
    captainName: team.captain_id ? (captainById.get(team.captain_id) ?? null) : null,
    memberCount: memberCount.get(team.id) ?? 0,
  }));
}

export async function getPublicTeam(teamId: string): Promise<PublicTeam | null> {
  const teams = await listPublicTeams(500);
  return teams.find((team) => team.teamId === teamId || team.slug === teamId) ?? null;
}
