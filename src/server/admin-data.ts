import "server-only";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type AdminOverviewStats = {
  pendingRegistrations: number;
  activeTournaments: number;
  scheduledMatches: number;
  liveSessions: number;
  teams: number;
  players: number;
};

export type AdminRegistrationRow = {
  id: string;
  status: string;
  createdAt: string;
  teamName: string;
  teamShortName: string;
  tournamentName: string;
  rejectionReason: string | null;
};

export type AdminTournamentRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  seasonName: string;
  maxTeams: number | null;
  registrationOpensAt: string | null;
  startsAt: string | null;
};

export type AdminMatchRow = {
  id: string;
  sequence: number;
  status: string;
  mapName: string | null;
  startsAt: string | null;
  eventName: string;
  tournamentName: string;
  resultCount: number;
  verifiedCount: number;
};

export type AdminSeasonOption = {
  id: string;
  name: string;
};

export type AdminEventOption = {
  id: string;
  label: string;
};

export type AdminTeamRow = {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  memberCount: number;
  isActive: boolean;
};

export type AdminPlayerRow = {
  id: string;
  displayName: string;
  username: string | null;
  platform: string | null;
  rank: string | null;
  teamName: string | null;
};

export type AdminSupporterRow = {
  id: string;
  name: string;
  category: string;
  startsOn: string;
  endsOn: string | null;
  annualNonCashValueUsd: number;
};

export type AdminScoringRow = {
  id: string;
  name: string;
  eventLabel: string;
  pointsPerKill: number;
  maxMatches: number | null;
  isActive: boolean;
};

async function getClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const supabase = await getClient();
  if (!supabase) {
    return {
      pendingRegistrations: 0,
      activeTournaments: 0,
      scheduledMatches: 0,
      liveSessions: 0,
      teams: 0,
      players: 0,
    };
  }

  const [
    { count: pendingRegistrations },
    { count: activeTournaments },
    { count: scheduledMatches },
    { count: liveSessions },
    { count: teams },
    { count: players },
  ] = await Promise.all([
    supabase.from("registrations").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("tournaments")
      .select("id", { count: "exact", head: true })
      .in("status", ["registration", "active"]),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .in("status", ["scheduled", "live"]),
    supabase
      .from("liveapi_sessions")
      .select("id", { count: "exact", head: true })
      .in("status", ["playing", "needs_mapping", "ready_for_review"]),
    supabase.from("teams").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("players").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  return {
    pendingRegistrations: pendingRegistrations ?? 0,
    activeTournaments: activeTournaments ?? 0,
    scheduledMatches: scheduledMatches ?? 0,
    liveSessions: liveSessions ?? 0,
    teams: teams ?? 0,
    players: players ?? 0,
  };
}

export async function listAdminRegistrations(): Promise<AdminRegistrationRow[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("registrations")
    .select(
      `
      id,
      status,
      created_at,
      rejection_reason,
      teams ( name, short_name ),
      tournaments ( name )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((row) => {
    const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
    const tournament = Array.isArray(row.tournaments) ? row.tournaments[0] : row.tournaments;
    return {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      teamName: team?.name ?? "Unknown Team",
      teamShortName: team?.short_name ?? "—",
      tournamentName: tournament?.name ?? "Unknown Tournament",
      rejectionReason: row.rejection_reason,
    };
  });
}

export async function listAdminTournaments(): Promise<AdminTournamentRow[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("tournaments")
    .select(
      `
      id,
      name,
      slug,
      status,
      max_teams,
      registration_opens_at,
      starts_at,
      seasons ( name )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => {
    const season = Array.isArray(row.seasons) ? row.seasons[0] : row.seasons;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      seasonName: season?.name ?? "—",
      maxTeams: row.max_teams,
      registrationOpensAt: row.registration_opens_at,
      startsAt: row.starts_at,
    };
  });
}

export async function listAdminSeasonOptions(): Promise<AdminSeasonOption[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("seasons")
    .select("id, name")
    .order("starts_on", { ascending: false })
    .limit(20);

  return (data ?? []).map((row) => ({ id: row.id, name: row.name }));
}

export async function listAdminMatches(): Promise<AdminMatchRow[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data: matches } = await supabase
    .from("matches")
    .select(
      `
      id,
      sequence,
      status,
      map_name,
      starts_at,
      events (
        name,
        tournaments ( name )
      )
    `,
    )
    .order("starts_at", { ascending: false, nullsFirst: false })
    .limit(50);

  if (!matches?.length) return [];

  const matchIds = matches.map(({ id }) => id);
  const { data: results } = await supabase
    .from("match_results")
    .select("match_id, verified_at")
    .in("match_id", matchIds);

  const resultCounts = new Map<string, { total: number; verified: number }>();
  for (const result of results ?? []) {
    const current = resultCounts.get(result.match_id) ?? { total: 0, verified: 0 };
    current.total += 1;
    if (result.verified_at) current.verified += 1;
    resultCounts.set(result.match_id, current);
  }

  return matches.map((row) => {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    const tournament = event?.tournaments
      ? Array.isArray(event.tournaments)
        ? event.tournaments[0]
        : event.tournaments
      : null;
    const counts = resultCounts.get(row.id) ?? { total: 0, verified: 0 };
    return {
      id: row.id,
      sequence: row.sequence,
      status: row.status,
      mapName: row.map_name,
      startsAt: row.starts_at,
      eventName: event?.name ?? "Event",
      tournamentName: tournament?.name ?? "Tournament",
      resultCount: counts.total,
      verifiedCount: counts.verified,
    };
  });
}

export async function listAdminMatchTeamOptions(
  matchId: string,
): Promise<Array<{ id: string; name: string; shortName: string }>> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data: matchTeams } = await supabase
    .from("match_teams")
    .select("team_id")
    .eq("match_id", matchId);

  const teamIds = (matchTeams ?? []).map(({ team_id }) => team_id);
  if (!teamIds.length) return [];

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, short_name")
    .in("id", teamIds);

  return (teams ?? []).map((team) => ({
    id: team.id,
    name: team.name,
    shortName: team.short_name,
  }));
}

export async function listAdminEventOptions(): Promise<AdminEventOption[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("events")
    .select("id, name, sequence, tournaments ( name )")
    .order("starts_at", { ascending: false })
    .limit(30);

  return (data ?? []).map((row) => {
    const tournament = Array.isArray(row.tournaments) ? row.tournaments[0] : row.tournaments;
    return {
      id: row.id,
      label: `${tournament?.name ?? "Tournament"} · ${row.name} (#${row.sequence})`,
    };
  });
}

export async function listAdminScoringConfigs(): Promise<AdminScoringRow[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("scoring_configs")
    .select("id, name, points_per_kill, max_matches, is_active, events ( name, sequence, tournaments ( name ) )")
    .order("created_at", { ascending: false })
    .limit(30);

  return (data ?? []).map((row) => {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    const tournament = event?.tournaments
      ? Array.isArray(event.tournaments)
        ? event.tournaments[0]
        : event.tournaments
      : null;
    return {
      id: row.id,
      name: row.name,
      eventLabel: event
        ? `${tournament?.name ?? "Tournament"} · ${event.name}`
        : "Unassigned",
      pointsPerKill: row.points_per_kill,
      maxMatches: row.max_matches,
      isActive: row.is_active,
    };
  });
}

export async function listAdminTeams(): Promise<AdminTeamRow[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, short_name, slug, is_active")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!teams?.length) return [];

  const teamIds = teams.map(({ id }) => id);
  const { data: members } = await supabase
    .from("team_players")
    .select("team_id")
    .in("team_id", teamIds)
    .is("left_at", null);

  const counts = new Map<string, number>();
  for (const member of members ?? []) {
    counts.set(member.team_id, (counts.get(member.team_id) ?? 0) + 1);
  }

  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    shortName: team.short_name,
    slug: team.slug,
    memberCount: counts.get(team.id) ?? 0,
    isActive: team.is_active,
  }));
}

export async function listAdminPlayers(): Promise<AdminPlayerRow[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data: players } = await supabase
    .from("players")
    .select("id, platform, rank, profiles ( display_name, username )")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!players?.length) return [];

  const playerIds = players.map(({ id }) => id);
  const { data: memberships } = await supabase
    .from("team_players")
    .select("player_id, teams ( name )")
    .in("player_id", playerIds)
    .is("left_at", null);

  const teamByPlayer = new Map<string, string>();
  for (const membership of memberships ?? []) {
    const team = Array.isArray(membership.teams) ? membership.teams[0] : membership.teams;
    if (team?.name) teamByPlayer.set(membership.player_id, team.name);
  }

  return players.map((player) => {
    const profile = Array.isArray(player.profiles) ? player.profiles[0] : player.profiles;
    return {
      id: player.id,
      displayName: profile?.display_name ?? "Player",
      username: profile?.username ?? null,
      platform: player.platform,
      rank: player.rank,
      teamName: teamByPlayer.get(player.id) ?? null,
    };
  });
}

export async function listAdminSupporters(): Promise<AdminSupporterRow[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("community_supporters")
    .select("id, name, category, starts_on, ends_on, annual_non_cash_value_usd")
    .order("starts_on", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    annualNonCashValueUsd: row.annual_non_cash_value_usd,
  }));
}
