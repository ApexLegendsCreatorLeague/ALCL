import Link from "next/link";

import {
  addSupporterAction,
  createTournamentAction,
  publishAnnouncementAction,
  reviewRegistrationAction,
  saveScoringConfigAction,
  submitMatchResultAction,
  updateTournamentStatusAction,
} from "@/app/admin/actions";
import { LiveApiAdmin } from "@/components/liveapi-admin";
import { DashboardShell } from "@/components/page-shell";
import { AdminTable } from "@/components/tables";
import { StatusBadge } from "@/components/ui";
import {
  getAdminOverviewStats,
  listAdminEventOptions,
  listAdminMatches,
  listAdminMatchTeamOptions,
  listAdminPlayers,
  listAdminRegistrations,
  listAdminScoringConfigs,
  listAdminSeasonOptions,
  listAdminSupporters,
  listAdminTeams,
  listAdminTournaments,
} from "@/server/admin-data";

const SECTIONS: Record<
  string,
  { title: string; description: string; path: string }
> = {
  "": {
    title: "Operations Overview",
    description: "Monitor league activity, publish announcements, and jump into the tools you need.",
    path: "/admin",
  },
  registrations: {
    title: "Registration Queue",
    description: "Review team registrations and approve, reject, or request changes.",
    path: "/admin/registrations",
  },
  tournaments: {
    title: "Tournament Management",
    description: "Create tournaments, open registration, and track event status.",
    path: "/admin/tournaments",
  },
  matches: {
    title: "Match Operations",
    description: "Review scheduled matches, enter verified results, and monitor scoring.",
    path: "/admin/matches",
  },
  "live-data": {
    title: "Live Match Data",
    description: "Bind observer sessions to ALCL teams and publish verified LiveAPI results.",
    path: "/admin/live-data",
  },
  scoring: {
    title: "Scoring Configuration",
    description: "Define placement tables and kill points for each event.",
    path: "/admin/scoring",
  },
  teams: {
    title: "Team Directory",
    description: "Registered squads across the league with roster counts.",
    path: "/admin/teams",
  },
  players: {
    title: "Player Directory",
    description: "Active competitor accounts and current team affiliations.",
    path: "/admin/players",
  },
  supporters: {
    title: "Community Supporters",
    description: "Approved non-cash supporters shown on the public site.",
    path: "/admin/supporters",
  },
};

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function successAlert(message: string) {
  return (
    <div className="card dashboard-alert dashboard-alert-success" role="status">
      <strong>Success</strong>
      <p>{message}</p>
    </div>
  );
}

function AdminAlert({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  if (error) {
    return (
      <div className="card dashboard-alert" role="alert">
        <strong>Action Failed</strong>
        <p>{decodeURIComponent(error)}</p>
      </div>
    );
  }

  if (searchParams.reviewed === "true") {
    return successAlert("Registration review saved.");
  }
  if (searchParams.created === "true") {
    return successAlert("Tournament created.");
  }
  if (searchParams.updated === "true") {
    return successAlert("Tournament status updated.");
  }
  if (searchParams.result === "true") {
    return successAlert("Match result recorded and standings updated.");
  }
  if (searchParams.saved === "true") {
    return successAlert("Scoring configuration saved.");
  }
  if (searchParams.added === "true") {
    return successAlert("Supporter added.");
  }
  if (searchParams.published === "true") {
    return successAlert("Announcement published.");
  }
  if (searchParams.binding === "saved") {
    return successAlert("LiveAPI team binding saved.");
  }
  if (searchParams.verified === "true") {
    return successAlert("LiveAPI results verified and published.");
  }

  return null;
}

function StatCard({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <div className="card admin-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

async function AdminOverview() {
  const stats = await getAdminOverviewStats();
  const pending = await listAdminRegistrations();

  return (
    <>
      <div className="admin-stat-grid">
        <StatCard label="Pending Registrations" value={stats.pendingRegistrations} href="/admin/registrations" />
        <StatCard label="Active Tournaments" value={stats.activeTournaments} href="/admin/tournaments" />
        <StatCard label="Scheduled Matches" value={stats.scheduledMatches} href="/admin/matches" />
        <StatCard label="Live Sessions" value={stats.liveSessions} href="/admin/live-data" />
        <StatCard label="Teams" value={stats.teams} href="/admin/teams" />
        <StatCard label="Players" value={stats.players} href="/admin/players" />
      </div>

      <div className="admin-split">
        <section className="card">
          <div className="section-head" style={{ marginBottom: 16 }}>
            <div>
              <div className="eyebrow">Quick Publish</div>
              <h3>League Announcement</h3>
            </div>
          </div>
          <form action={publishAnnouncementAction} className="admin-form">
            <label className="field">
              Title
              <input className="input" name="title" required placeholder="Registration opens Friday" />
            </label>
            <label className="field">
              Message
              <textarea className="input" name="body" required rows={4} placeholder="Share updates with competitors." />
            </label>
            <button className="btn btn-primary" type="submit">
              Publish Announcement
            </button>
          </form>
        </section>

        <section className="card">
          <div className="section-head" style={{ marginBottom: 16 }}>
            <div>
              <div className="eyebrow">Needs Review</div>
              <h3>Latest Registrations</h3>
            </div>
            <Link className="btn" href="/admin/registrations">
              Open Queue
            </Link>
          </div>
          {pending.length ? (
            <AdminTable
              rows={pending.slice(0, 5).map((row) => ({
                name: row.teamName,
                meta: row.tournamentName,
                status: formatStatus(row.status),
                href: "/admin/registrations",
              }))}
            />
          ) : (
            <p className="legal">No registrations in the queue yet.</p>
          )}
        </section>
      </div>
    </>
  );
}

async function AdminRegistrationsSection() {
  const registrations = await listAdminRegistrations();

  if (!registrations.length) {
    return (
      <div className="card">
        <h3>No Registrations Yet</h3>
        <p>Team registration submissions will appear here for review.</p>
      </div>
    );
  }

  return (
    <div className="admin-stack">
      {registrations.map((registration) => (
        <section className="card" key={registration.id}>
          <div className="toolbar">
            <div>
              <strong>{registration.teamName}</strong>
              <p className="legal">
                {registration.tournamentName} · submitted {new Date(registration.createdAt).toLocaleString()}
              </p>
            </div>
            <StatusBadge status={formatStatus(registration.status)} />
          </div>
          {registration.rejectionReason ? (
            <p className="legal">Previous note: {registration.rejectionReason}</p>
          ) : null}
          {registration.status === "pending" || registration.status === "needs_changes" ? (
            <div className="admin-review-grid">
              <form action={reviewRegistrationAction}>
                <input name="registrationId" type="hidden" value={registration.id} />
                <input name="status" type="hidden" value="approved" />
                <button className="btn btn-primary" type="submit">
                  Approve
                </button>
              </form>
              <form action={reviewRegistrationAction} className="admin-inline-form">
                <input name="registrationId" type="hidden" value={registration.id} />
                <input name="status" type="hidden" value="needs_changes" />
                <input className="input" name="reason" placeholder="Reason for changes" required />
                <button className="btn" type="submit">
                  Request Changes
                </button>
              </form>
              <form action={reviewRegistrationAction} className="admin-inline-form">
                <input name="registrationId" type="hidden" value={registration.id} />
                <input name="status" type="hidden" value="rejected" />
                <input className="input" name="reason" placeholder="Rejection reason" required />
                <button className="btn" type="submit">
                  Reject
                </button>
              </form>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

async function AdminTournamentsSection() {
  const [tournaments, seasons] = await Promise.all([listAdminTournaments(), listAdminSeasonOptions()]);

  return (
    <>
      <section className="card admin-form-card">
        <div className="eyebrow">Create Tournament</div>
        <h3>New Community Event</h3>
        <form action={createTournamentAction} className="admin-form admin-form-grid">
          <label className="field">
            Season
            <select className="input" name="seasonId" required>
              <option value="">Select Season</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Name
            <input className="input" name="name" required placeholder="ALCL Open Qualifier 1" />
          </label>
          <label className="field">
            Slug
            <input className="input" name="slug" required pattern="[a-z0-9-]+" placeholder="alcl-open-qualifier-1" />
          </label>
          <label className="field">
            Country Code
            <input className="input" defaultValue="US" maxLength={2} name="countryCode" required />
          </label>
          <label className="field">
            Max Teams
            <input className="input" max={200} min={2} name="maxTeams" type="number" />
          </label>
          <label className="field">
            Registration Opens
            <input className="input" name="registrationOpensAt" type="datetime-local" />
          </label>
          <label className="field">
            Registration Closes
            <input className="input" name="registrationClosesAt" type="datetime-local" />
          </label>
          <label className="field">
            Starts
            <input className="input" name="startsAt" type="datetime-local" />
          </label>
          <label className="field">
            Ends
            <input className="input" name="endsAt" type="datetime-local" />
          </label>
          <div className="admin-form-span">
            <button className="btn btn-primary" type="submit">
              Create Tournament
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h3>Existing Tournaments</h3>
        {tournaments.length ? (
          <div className="admin-stack">
            {tournaments.map((tournament) => (
              <div className="admin-list-row" key={tournament.id}>
                <div>
                  <strong>{tournament.name}</strong>
                  <p className="legal">
                    {tournament.seasonName} · /{tournament.slug}
                    {tournament.maxTeams ? ` · max ${tournament.maxTeams} teams` : ""}
                  </p>
                </div>
                <div className="admin-list-actions">
                  <StatusBadge status={formatStatus(tournament.status)} />
                  <form action={updateTournamentStatusAction}>
                    <input name="tournamentId" type="hidden" value={tournament.id} />
                    <select className="input" defaultValue={tournament.status} name="status">
                      <option value="draft">Draft</option>
                      <option value="registration">Registration</option>
                      <option value="active">Active</option>
                      <option value="complete">Complete</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button className="btn" type="submit">
                      Update Status
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="legal">No tournaments yet. Create one above or seed demo data locally.</p>
        )}
      </section>
    </>
  );
}

async function AdminMatchesSection() {
  const matches = await listAdminMatches();
  const teamsByMatch = await Promise.all(
    matches.map(async (match) => ({
      matchId: match.id,
      teams: await listAdminMatchTeamOptions(match.id),
    })),
  );
  const teamMap = new Map(teamsByMatch.map(({ matchId, teams }) => [matchId, teams]));

  if (!matches.length) {
    return (
      <div className="card">
        <h3>No Matches Scheduled</h3>
        <p>Matches appear after events are configured in the database. Use Live Data once a match exists.</p>
        <Link className="btn" href="/admin/live-data">
          Open Live Data
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-stack">
      {matches.map((match) => {
        const teams = teamMap.get(match.id) ?? [];
        return (
          <section className="card" key={match.id}>
            <div className="toolbar">
              <div>
                <strong>
                  {match.tournamentName} · {match.eventName} · Game {match.sequence}
                </strong>
                <p className="legal">
                  {match.mapName ?? "Map TBD"}
                  {match.startsAt ? ` · ${new Date(match.startsAt).toLocaleString()}` : ""}
                </p>
              </div>
              <StatusBadge status={formatStatus(match.status)} />
            </div>
            <p className="legal">
              Results: {match.verifiedCount}/{match.resultCount} verified
            </p>
            {teams.length ? (
              <form action={submitMatchResultAction} className="admin-form admin-form-grid">
                <input name="matchId" type="hidden" value={match.id} />
                <label className="field">
                  Team
                  <select className="input" name="teamId" required>
                    <option value="">Select Team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.shortName})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Placement
                  <input className="input" max={60} min={1} name="placement" required type="number" />
                </label>
                <label className="field">
                  Kills
                  <input className="input" max={200} min={0} name="kills" required type="number" />
                </label>
                <label className="field">
                  Bonus Points
                  <input className="input" defaultValue={0} name="bonusPoints" type="number" />
                </label>
                <label className="field">
                  Penalty Points
                  <input className="input" defaultValue={0} min={0} name="penaltyPoints" type="number" />
                </label>
                <label className="field admin-form-span">
                  Evidence URL
                  <input className="input" name="evidencePath" placeholder="https://..." type="url" />
                </label>
                <div className="admin-form-span">
                  <button className="btn btn-primary" type="submit">
                    Record Verified Result
                  </button>
                </div>
              </form>
            ) : (
              <p className="legal">Assign match teams before entering results.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

async function AdminScoringSection() {
  const [configs, events] = await Promise.all([listAdminScoringConfigs(), listAdminEventOptions()]);
  const defaultPlacement = [25, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

  return (
    <>
      <section className="card admin-form-card">
        <div className="eyebrow">Scoring Setup</div>
        <h3>Create Event Scoring Table</h3>
        <form action={saveScoringConfigAction} className="admin-form">
          <label className="field">
            Event
            <select className="input" name="eventId" required>
              <option value="">Select Event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Configuration Name
            <input className="input" name="name" required placeholder="Standard ALGS Points" />
          </label>
          <label className="field">
            Points Per Kill
            <input className="input" defaultValue={1} min={0} name="pointsPerKill" required type="number" />
          </label>
          <label className="field">
            Max Matches
            <input className="input" max={100} min={1} name="maxMatches" type="number" />
          </label>
          <div className="admin-placement-grid">
            {defaultPlacement.map((points, index) => (
              <label className="field" key={index + 1}>
                #{index + 1}
                <input
                  className="input"
                  defaultValue={points}
                  min={0}
                  name={`placement_${index + 1}`}
                  type="number"
                />
              </label>
            ))}
          </div>
          <button className="btn btn-primary" type="submit">
            Save Scoring Config
          </button>
        </form>
      </section>

      <section className="card">
        <h3>Saved Configurations</h3>
        {configs.length ? (
          <AdminTable
            rows={configs.map((config) => ({
              name: config.name,
              meta: `${config.eventLabel} · ${config.pointsPerKill} pts/kill`,
              status: config.isActive ? "Active" : "Draft",
            }))}
          />
        ) : (
          <p className="legal">No scoring configurations yet.</p>
        )}
      </section>
    </>
  );
}

async function AdminTeamsSection() {
  const teams = await listAdminTeams();
  if (!teams.length) {
    return (
      <div className="card">
        <h3>No Teams Yet</h3>
        <p>Teams appear after players create squads from the public site.</p>
      </div>
    );
  }

  return (
    <AdminTable
      rows={teams.map((team) => ({
        name: team.name,
        meta: `${team.shortName} · ${team.memberCount} players · /teams/${team.slug}`,
        status: team.isActive ? "Active" : "Inactive",
        href: `/teams/${team.id}`,
      }))}
    />
  );
}

async function AdminPlayersSection() {
  const players = await listAdminPlayers();
  if (!players.length) {
    return (
      <div className="card">
        <h3>No Players Yet</h3>
        <p>Player accounts appear after registration completes.</p>
      </div>
    );
  }

  return (
    <AdminTable
      rows={players.map((player) => ({
        name: player.displayName,
        meta: [
          player.username ? `@${player.username}` : null,
          player.teamName,
          player.platform,
          player.rank,
        ]
          .filter(Boolean)
          .join(" · "),
        status: "Active",
        href: `/players/${player.id}`,
      }))}
    />
  );
}

async function AdminSupportersSection() {
  const supporters = await listAdminSupporters();

  return (
    <>
      <section className="card admin-form-card">
        <div className="eyebrow">Community Compliance</div>
        <h3>Add Supporter</h3>
        <form action={addSupporterAction} className="admin-form admin-form-grid">
          <label className="field">
            Name
            <input className="input" name="name" required />
          </label>
          <label className="field">
            Category Slug
            <input className="input" name="category" placeholder="equipment-partner" required />
          </label>
          <label className="field">
            Website
            <input className="input" name="websiteUrl" placeholder="https://example.com" type="url" />
          </label>
          <label className="field">
            Annual Non-Cash Value (USD)
            <input className="input" min={0} name="annualNonCashValueUsd" required type="number" />
          </label>
          <label className="field">
            Starts On
            <input className="input" name="startsOn" required type="date" />
          </label>
          <label className="field">
            Ends On
            <input className="input" name="endsOn" type="date" />
          </label>
          <div className="admin-form-span">
            <button className="btn btn-primary" type="submit">
              Add Supporter
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h3>Published Supporters</h3>
        {supporters.length ? (
          <AdminTable
            rows={supporters.map((supporter) => ({
              name: supporter.name,
              meta: `${supporter.category} · $${supporter.annualNonCashValueUsd}/yr`,
              status: supporter.endsOn ? "Scheduled" : "Active",
            }))}
          />
        ) : (
          <p className="legal">No supporters listed yet.</p>
        )}
      </section>
    </>
  );
}

async function AdminSectionContent({ section }: { section?: string }) {
  switch (section) {
    case "registrations":
      return <AdminRegistrationsSection />;
    case "tournaments":
      return <AdminTournamentsSection />;
    case "matches":
      return <AdminMatchesSection />;
    case "live-data":
      return <LiveApiAdmin />;
    case "scoring":
      return <AdminScoringSection />;
    case "teams":
      return <AdminTeamsSection />;
    case "players":
      return <AdminPlayersSection />;
    case "supporters":
      return <AdminSupportersSection />;
    default:
      return <AdminOverview />;
  }
}

export async function AdminWorkspace({
  section,
  searchParams = {},
}: {
  section?: string;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const meta = SECTIONS[section ?? ""] ?? {
    title: "Organizer Console",
    description: "Competition administration with server-enforced policy checks.",
    path: `/admin/${section ?? ""}`,
  };

  return (
    <DashboardShell
      activePath={meta.path}
      admin
      description={meta.description}
      title={meta.title}
    >
      <AdminAlert searchParams={searchParams} />
      <div className="admin-content">
        <AdminSectionContent section={section} />
      </div>
    </DashboardShell>
  );
}
