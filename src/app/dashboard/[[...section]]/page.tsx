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
    view === "team" ? (focusedTeam?.name ?? "My Team") : "Player Dashboard";

  const copy =
    view === "team"
      ? "Manage the team you captain, review roster players, and track registration status."
      : "Your home base after sign-in - profile, team, and next steps.";

  return (
    <AppShell>
      <PageHeader eyebrow="Signed In" title={title} copy={copy} />
      <section className="container dashboard-page">
        <DashboardTabs />
        <DashboardAlert
          error={query.error}
          status={query.status}
          message={query.message}
        />

        {view === "team" ? (
          focusedTeam ? (
            <div style={{ marginTop: 18 }}>
              <div className="grid grid-4">
                <StatCard label="Abbreviation" value={focusedTeam.shortName} />
                <StatCard
                  label="Registration"
                  value={focusedTeam.registrationStatus ?? "Not submitted"}
                />
                <StatCard label="Roster Size" value={String(focusedTeam.members.length)} />
                <StatCard label="Event" value={focusedTeam.tournamentName ?? "-"} />
              </div>
              <div className="card" style={{ marginTop: 18 }}>
                <StatusBadge
                  status={
                    focusedTeam.registrationStatus === "approved"
                      ? "Approved"
                      : focusedTeam.registrationStatus === "pending"
                        ? "Pending Review"
                        : "Team Created"
                  }
                />
                <h3>{focusedTeam.name}</h3>
                <p>You are the team manager for this roster.</p>
                <div className="actions">
                  <Link className="btn btn-primary" href="/dashboard/team/create">
                    Create Another Team
                  </Link>
                </div>
              </div>
              <div className="card" style={{ marginTop: 18 }}>
                <h3>Roster Players</h3>
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
              <h3>No Team Yet</h3>
              <p>Create a team to register for ALCL events. You will be Player 1 and the manager.</p>
              <div className="actions">
                <Link className="btn btn-primary" href="/dashboard/team/create">
                  Create a Team
                </Link>
              </div>
            </div>
          )
        ) : null}

        {view === "overview" || view !== "team" ? (
          <div style={{ marginTop: 18 }}>
            <div className="grid grid-4">
              <StatCard label="Display Name" value={player.displayName} />
              <StatCard label="Teams Managed" value={String(player.managedTeams.length)} />
              <StatCard label="Platform" value={player.platform ?? "-"} />
              <StatCard label="Rank" value={player.rank ?? "-"} />
            </div>
            <div className="grid grid-2" style={{ marginTop: 18 }}>
              <div className="card">
                <h3>Welcome Back, {player.displayName}</h3>
                <p>Signed in as a player. Teams never log in - only player accounts do.</p>
                <div className="actions">
                  <Link className="btn btn-primary" href={`/players/${player.playerId}`}>
                    View Profile
                  </Link>
                  {player.managedTeams[0] ? (
                    <Link className="btn" href={`/dashboard/team?team=${player.managedTeams[0].id}`}>
                      Open My Team
                    </Link>
                  ) : (
                    <Link className="btn" href="/dashboard/team/create">
                      Create a Team
                    </Link>
                  )}
                </div>
              </div>
              <div className="card">
                <h3>Registration Status</h3>
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
