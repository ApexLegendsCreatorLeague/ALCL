import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PageHeader, StatCard, StatusBadge } from "@/components/alcl";
import { DashboardAlert } from "@/components/dashboard-alert";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { getManagedTeam, getPlayerDashboard } from "@/server/player-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardRoute({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{ error?: string; team?: string; status?: string; message?: string }>;
}) {
  const [{ section = [] }, query] = await Promise.all([params, searchParams]);
  const view = section[0] ?? "overview";
  const player = await getPlayerDashboard();
  const focusedTeamId = query.team ?? player.managedTeams[0]?.id ?? null;
  const focusedTeam = focusedTeamId ? await getManagedTeam(focusedTeamId) : null;

  const title =
    view === "player"
      ? "My profile"
      : view === "team"
        ? focusedTeam?.name ?? "My team"
        : "Player dashboard";

  const copy =
    view === "player"
      ? "Your ALCL player account, platform details, and competition identity."
      : view === "team"
        ? "Manage the team you captain, review roster players, and track registration status."
        : "Your home base after sign-in — profile, team, and next steps.";

  return (
    <AppShell>
      <PageHeader eyebrow="Signed in" title={title} copy={copy} />
      <section className="container dashboard-page">
        <DashboardTabs />
        <DashboardAlert
          error={query.error}
          status={query.status}
          message={query.message}
        />

        {view === "player" ? (
          <div className="grid grid-2" style={{ marginTop: 18 }}>
            <div className="card">
              <small>PLAYER ACCOUNT</small>
              <h3>{player.displayName}</h3>
              <p>
                {player.email}
                {player.username ? ` · @${player.username}` : ""}
              </p>
              <p>
                Platform: {player.platform ?? "Not set"} · Region: {player.countryCode}
              </p>
              <p>Rank snapshot: {player.rank ?? "Not recorded yet"}</p>
            </div>
            <div className="card">
              <small>NEXT STEPS</small>
              <h3>Compete with your team</h3>
              <p>
                Team managers create a team and add registered players. You are always Player 1 on
                your own roster.
              </p>
              <div className="actions">
                <Link className="btn btn-primary" href="/dashboard/team/create">
                  Create a team
                </Link>
                <Link className="btn" href="/tournaments">
                  Browse tournaments
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {view === "team" ? (
          focusedTeam ? (
            <div style={{ marginTop: 18 }}>
              <div className="grid grid-4">
                <StatCard label="Abbreviation" value={focusedTeam.shortName} />
                <StatCard
                  label="Registration"
                  value={focusedTeam.registrationStatus ?? "Not submitted"}
                />
                <StatCard label="Roster size" value={String(focusedTeam.members.length)} />
                <StatCard label="Event" value={focusedTeam.tournamentName ?? "—"} />
              </div>
              <div className="card" style={{ marginTop: 18 }}>
                <StatusBadge
                  status={
                    focusedTeam.registrationStatus === "approved"
                      ? "Approved"
                      : focusedTeam.registrationStatus === "pending"
                        ? "Pending review"
                        : "Team created"
                  }
                />
                <h3>{focusedTeam.name}</h3>
                <p>You are the team manager for this roster.</p>
                <div className="actions">
                  <Link className="btn btn-primary" href="/dashboard/team/create">
                    Create another team
                  </Link>
                </div>
              </div>
              <div className="card" style={{ marginTop: 18 }}>
                <h3>Roster players</h3>
                {focusedTeam.members.length === 0 ? (
                  <p className="legal">No roster players linked yet.</p>
                ) : (
                  focusedTeam.members.map((member, index) => (
                    <p key={member.playerId}>
                      {index === 0 ? "Player 1 (manager)" : `Player ${index + 1}`}:{" "}
                      {member.displayName}
                      {member.isCaptain ? " · Manager" : ""}
                    </p>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ marginTop: 18 }}>
              <h3>No team yet</h3>
              <p>Create a team to register for ALCL events. You will be Player 1 and the manager.</p>
              <div className="actions">
                <Link className="btn btn-primary" href="/dashboard/team/create">
                  Create a team
                </Link>
              </div>
            </div>
          )
        ) : null}

        {view === "overview" || (view !== "player" && view !== "team") ? (
          <div style={{ marginTop: 18 }}>
            <div className="grid grid-4">
              <StatCard label="Display name" value={player.displayName} />
              <StatCard label="Teams managed" value={String(player.managedTeams.length)} />
              <StatCard label="Platform" value={player.platform ?? "—"} />
              <StatCard label="Rank" value={player.rank ?? "—"} />
            </div>
            <div className="grid grid-2" style={{ marginTop: 18 }}>
              <div className="card">
                <h3>Welcome back, {player.displayName}</h3>
                <p>Signed in as a player. Teams never log in — only player accounts do.</p>
                <div className="actions">
                  <Link className="btn btn-primary" href="/dashboard/player">
                    View profile
                  </Link>
                  {player.managedTeams[0] ? (
                    <Link className="btn" href={`/dashboard/team?team=${player.managedTeams[0].id}`}>
                      Open my team
                    </Link>
                  ) : (
                    <Link className="btn" href="/dashboard/team/create">
                      Create a team
                    </Link>
                  )}
                </div>
              </div>
              <div className="card">
                <h3>Registration status</h3>
                {player.managedTeams.length === 0 ? (
                  <p>You have not created a team yet. Start there before event registration.</p>
                ) : (
                  player.managedTeams.map((team) => (
                    <p key={team.id}>
                      <Link href={`/dashboard/team?team=${team.id}`}>{team.name}</Link>
                      {" · "}
                      {team.registrationStatus ?? "Team only"}
                      {team.tournamentName ? ` · ${team.tournamentName}` : ""}
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
