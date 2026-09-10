import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { userManagesTeam } from "@/server/teams";

export type TeamMemberSummary = {
  playerId: string;
  displayName: string;
  isCaptain: boolean;
};

export type ManagedTeamSummary = {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  members: TeamMemberSummary[];
  registrationStatus: string | null;
  tournamentName: string | null;
};

export type PlayerDashboardData = {
  profileId: string;
  displayName: string;
  username: string | null;
  email: string | null;
  playerId: string;
  platform: string | null;
  rank: string | null;
  apexTag: string | null;
  rankVerifiedAt: string | null;
  countryCode: string;
  managedTeams: ManagedTeamSummary[];
};

export async function getPlayerDashboard(): Promise<PlayerDashboardData> {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: profile }, { data: player }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, username, country_code")
      .eq("id", user.id)
      .single(),
    supabase
      .from("players")
      .select("id, platform, rank, apex_tag, rank_verified_at, country_code")
      .eq("profile_id", user.id)
      .single(),
  ]);

  if (!player) {
    throw new Error("Player profile not found.");
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, short_name, slug")
    .eq("captain_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const managedTeams: ManagedTeamSummary[] = [];

  for (const team of teams ?? []) {
    const { data: memberships } = await supabase
      .from("team_players")
      .select("player_id, is_captain")
      .eq("team_id", team.id)
      .is("left_at", null);

    const playerIds = (memberships ?? []).map((membership) => membership.player_id);
    const displayNameByPlayerId = new Map<string, string>();

    if (playerIds.length > 0) {
      const { data: rosterPlayers } = await supabase
        .from("players")
        .select("id, profile_id")
        .in("id", playerIds);

      const profileIds = (rosterPlayers ?? []).map((rosterPlayer) => rosterPlayer.profile_id);
      const { data: profiles } = profileIds.length
        ? await supabase.from("profiles").select("id, display_name").in("id", profileIds)
        : { data: [] as Array<{ id: string; display_name: string }> };

      const displayNameByProfileId = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
      );

      for (const rosterPlayer of rosterPlayers ?? []) {
        displayNameByPlayerId.set(
          rosterPlayer.id,
          displayNameByProfileId.get(rosterPlayer.profile_id) ?? "Player",
        );
      }
    }

    const members: TeamMemberSummary[] = (memberships ?? []).map((membership) => ({
      playerId: membership.player_id,
      displayName: displayNameByPlayerId.get(membership.player_id) ?? "Player",
      isCaptain: membership.is_captain,
    }));

    const { data: registration } = await supabase
      .from("registrations")
      .select("status, tournament_id")
      .eq("team_id", team.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let tournamentName: string | null = null;
    if (registration?.tournament_id) {
      const { data: tournament } = await supabase
        .from("tournaments")
        .select("name")
        .eq("id", registration.tournament_id)
        .maybeSingle();
      tournamentName = tournament?.name ?? null;
    }

    managedTeams.push({
      id: team.id,
      name: team.name,
      shortName: team.short_name,
      slug: team.slug,
      members,
      registrationStatus: registration?.status ?? null,
      tournamentName,
    });
  }

  return {
    profileId: user.id,
    displayName: profile?.display_name ?? user.email?.split("@")[0] ?? "Player",
    username: profile?.username ?? null,
    email: user.email ?? null,
    playerId: player.id,
    platform: player.platform,
    rank: player.rank,
    apexTag: player.apex_tag,
    rankVerifiedAt: player.rank_verified_at,
    countryCode: player.country_code ?? profile?.country_code ?? "US",
    managedTeams,
  };
}

export async function getManagedTeam(teamId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!(await userManagesTeam(supabase, teamId, user.id))) {
    return null;
  }

  const dashboard = await getPlayerDashboard();
  return dashboard.managedTeams.find((team) => team.id === teamId) ?? null;
}
