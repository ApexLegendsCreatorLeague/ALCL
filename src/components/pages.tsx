import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { AuthCtaButtons } from "@/components/auth-cta-buttons";
import {
  AdminActions,
  AdminTable,
  BroadcastView,
  EmptyState,
  LegalDisclaimer,
  PageHeader,
  PlayerCard,
  QualificationProgress,
  Search,
  SectionTitle,
  StatusBadge,
  TeamCard,
  TournamentTimeline,
} from "./alcl";
import { AuthForm } from "@/components/auth-form";
import { LiveApiAdmin } from "@/components/liveapi-admin";
import { PlayerProfileNotFound, PlayerProfileView } from "@/components/player-profile-view";
import { PlayersDirectory } from "@/components/players-directory";
import { getCurrentUser } from "@/server/auth";
import { getPlayerProfile } from "@/server/player-profile";
import { getPublicTeam, listPublicPlayers, listPublicTeams } from "@/server/public-directory";

export async function HomePage() {
  const [players, teams] = await Promise.all([listPublicPlayers(6), listPublicTeams(6)]);
  return (
    <AppShell>
      <section className="hero">
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div className="eyebrow">ALCL community league</div>
          <h1 className="display">
            THE ARENA
            <br />
            <span style={{ color: "var(--lime)" }}>BELONGS TO YOU.</span>
          </h1>
          <p>
            Independent community tournaments for Apex Legends. Compete in structured seasons, build
            your legacy, and earn your place at the ALCL Championship.
          </p>
          <div className="actions">
            <Link className="btn btn-primary" href="/register">
              Create player account
            </Link>
            <Link className="btn" href="/login">
              Player sign in
            </Link>
            <Link className="btn btn-ghost" href="/tournaments">
              Explore tournaments
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionTitle
            eyebrow="Next up"
            title="Enter the circuit"
            copy="Tournaments, standings, and schedules will appear here as organizers publish them."
            action={
              <Link className="btn" href="/tournaments">
                View tournaments
              </Link>
            }
          />
          <EmptyState
            title="No tournaments published yet"
            message="Check back soon — the first ALCL events are being prepared."
          />
        </div>
      </section>

      <section className="section" style={{ background: "#0b0e13" }}>
        <div className="container">
          <SectionTitle
            eyebrow="Season leaderboard"
            title="Standings"
            action={
              <Link className="btn" href="/standings">
                Full standings
              </Link>
            }
          />
          <EmptyState
            title="No standings yet"
            message="Season standings will appear after the first completed event."
          />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionTitle
            eyebrow="Community"
            title="Teams & players"
            copy="Registered teams and player profiles appear here as the league grows."
            action={
              players.length || teams.length ? (
                <Link className="btn" href="/players">
                  View all players
                </Link>
              ) : undefined
            }
          />
          {players.length || teams.length ? (
            <div className="grid grid-3">
              {teams.map((team) => (
                <TeamCard
                  key={team.teamId}
                  teamId={team.teamId}
                  name={team.name}
                  shortName={team.shortName}
                  captainName={team.captainName}
                  memberCount={team.memberCount}
                />
              ))}
              {players.map((player) => (
                <PlayerCard
                  key={player.playerId}
                  playerId={player.playerId}
                  name={player.displayName}
                  teamName={player.teamName}
                  platform={player.platform}
                  rank={player.rank}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No teams or players listed yet"
              message="Create a player account and form a team to get started."
            />
          )}
        </div>
      </section>
    </AppShell>
  );
}

const info: Record<string, [string, string, string]> = {
  league: [
    "ALCL league",
    "The ALCL League",
    "Season schedule, milestones, and cumulative performance will be published here.",
  ],
  tournaments: [
    "Competition hub",
    "Find your next fight",
    "Browse open registrations, live events, and completed community tournaments.",
  ],
  standings: [
    "Season standings",
    "Every point matters",
    "Cumulative standings across the ALCL season circuit.",
  ],
  teams: [
    "Team directory",
    "Built to compete",
    "Discover squads and follow their path through the circuit.",
  ],
  players: [
    "Player directory",
    "Meet the competitors",
    "Profiles, performance snapshots, and team affiliations for ALCL competitors.",
  ],
  championship: [
    "The final stage",
    "ALCL Championship",
    "The season’s best teams converge for one decisive weekend.",
  ],
  supporters: [
    "Community powered",
    "ALCL supporters",
    "The people and groups helping independent competition thrive.",
  ],
  rules: [
    "Competition guide",
    "Rules & format",
    "Clear standards for fair, consistent, and community-first competition.",
  ],
  "hall-of-fame": [
    "ALCL history",
    "Hall of fame",
    "Celebrating champions, record breakers, and unforgettable seasons.",
  ],
  legal: [
    "Policies",
    "Legal & integrity",
    "How ALCL operates, protects competitors, and communicates its independent status.",
  ],
  dashboard: [
    "Competitor portal",
    "Your dashboard",
    "Your season at a glance—registrations, matches, and account actions.",
  ],
};

function StandardHeader({ type }: { type: string }) {
  const data = info[type] ?? ["ALCL", "Competition center", "Everything you need for the current ALCL season."];
  return <PageHeader eyebrow={data[0]} title={data[1]} copy={data[2]} />;
}

function Article({ sections }: { sections: [string, string][] }) {
  return (
    <div className="grid grid-2">
      {sections.map(([heading, body]) => (
        <article className="card" key={heading}>
          <h3>{heading}</h3>
          <p>{body}</p>
        </article>
      ))}
    </div>
  );
}

export async function RoutePage({ segments }: { segments: string[] }) {
  const [root, id, leaf] = segments;
  const key = segments.join("/");
  if (root === "broadcast") return <BroadcastView type={id ?? "leaderboard"} />;
  if (root === "login") return <AuthPage />;
  if (root === "admin") return <AdminPage section={id} />;
  if (root === "tournaments" && id) return <TournamentDetail id={id} leaf={leaf} />;
  if (root === "league" && id) return <SeasonDetail season={id} />;
  if (root === "teams" && id) return <TeamDetail id={id} />;
  if (root === "players" && id) return <PlayerDetail id={id} />;
  return <Directory type={root || key} />;
}

async function Directory({ type }: { type: string }) {
  let content: React.ReactNode;

  if (type === "tournaments") {
    content = (
      <EmptyState
        title="No tournaments published yet"
        message="Organizers will publish events here when registration opens."
      />
    );
  } else if (type === "teams") {
    const teams = await listPublicTeams();
    content = (
      <>
        <div className="toolbar">
          <Search placeholder="Search teams…" />
          <div className="actions" style={{ marginTop: 0 }}>
            <AuthCtaButtons showCreateTeam compact />
          </div>
        </div>
        {teams.length ? (
          <div className="grid grid-3">
            {teams.map((team) => (
              <TeamCard
                key={team.teamId}
                teamId={team.teamId}
                name={team.name}
                shortName={team.shortName}
                captainName={team.captainName}
                memberCount={team.memberCount}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No teams registered yet"
            message="Sign in and create a team to appear in the directory."
          />
        )}
      </>
    );
  } else if (type === "players") {
    const players = await listPublicPlayers();
    content = <PlayersDirectory players={players} />;
  } else if (type === "standings") {
    content = (
      <EmptyState
        title="No standings yet"
        message="Standings will be calculated after event results are recorded."
      />
    );
  } else if (type === "league") {
    content = (
      <>
        <QualificationProgress />
        <div style={{ marginTop: 40 }}>
          <TournamentTimeline />
        </div>
      </>
    );
  } else if (type === "championship") {
    content = (
      <EmptyState
        title="Championship field not set"
        message="Qualified teams will appear here during the season."
      />
    );
  } else if (type === "supporters") {
    content = (
      <EmptyState
        title="No supporters published yet"
        message="Community supporters will be listed here once approved."
      />
    );
  } else if (type === "hall-of-fame") {
    content = (
      <EmptyState
        title="Hall of fame is empty"
        message="Season champions and record holders will be recorded here."
      />
    );
  } else if (type === "rules") {
    content = (
      <>
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>ALCL competition rules</h3>
          <p>
            Official event rules will be published and versioned before each tournament opens for
            registration.
          </p>
        </div>
        <Article
          sections={[
            "Eligibility",
            "Team Requirements",
            "Roster Requirements",
            "Rank Requirements",
            "Registration",
            "Roster Lock",
            "Substitutes",
            "Match Participation",
            "Tournament Scoring",
            "Season Points",
            "Championship Qualification",
            "Conduct",
            "Disputes",
            "Penalties",
          ].map(
            (title, index) =>
              [
                `${String(index + 1).padStart(2, "0")} · ${title}`,
                `Event-specific ${title.toLowerCase()} requirements will be published before the applicable community event.`,
              ] as [string, string],
          )}
        />
      </>
    );
  } else if (type === "legal") {
    content = (
      <Article
        sections={[
          [
            "Independent Community Tournament",
            "ALCL is an independent community tournament organization. It is not an EA, Respawn, ALGS, or other EA-entity program.",
          ],
          [
            "EA Disclaimer",
            "This tournament is not affiliated with or sponsored by Electronic Arts Inc.",
          ],
          [
            "Intellectual Property",
            "ALCL uses original branding. Organizers and participants must have rights to uploaded names, logos, images, and other materials.",
          ],
          [
            "Participant Responsibilities",
            "Participants remain responsible for applicable EA terms, platform rules, published event rules, local law, and account standing.",
          ],
          [
            "Rules of Conduct",
            "Cheating, collusion, exploits, harassment, discriminatory conduct, and falsified information are prohibited.",
          ],
          [
            "Privacy",
            "ALCL collects only tournament-operational information needed to run community events.",
          ],
          [
            "Terms of Participation",
            "Participation is subject to published event-specific eligibility, roster, scoring, dispute, and conduct rules.",
          ],
        ]}
      />
    );
  } else {
    content = (
      <EmptyState title="Nothing published yet" message="Content for this section is coming soon." />
    );
  }

  return (
    <AppShell>
      <StandardHeader type={type} />
      <section className="container">{content}</section>
    </AppShell>
  );
}

function TournamentDetail({ id, leaf }: { id: string; leaf?: string }) {
  const title = id.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");

  let content: React.ReactNode;
  if (leaf === "registration") {
    content = (
      <div className="card">
        <StatusBadge status="Coming soon" />
        <h3>Player registration</h3>
        <p>
          Every competitor needs a player account first. After you sign in, create a team and add
          registered players to the roster.
        </p>
        <div className="actions">
          <AuthCtaButtons showCreateTeam />
        </div>
      </div>
    );
  } else {
    content = (
      <EmptyState
        title="Event not published yet"
        message={`Details for ${title} will appear when organizers publish this tournament.`}
      />
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="ALCL community tournament"
        title={leaf ? `${title} · ${leaf}` : title}
        copy="Independent community competition with configurable tournament scoring and season qualification."
      />
      <section className="container">
        <div className="card" style={{ marginBottom: 20, borderColor: "#c7ff4740" }}>
          <LegalDisclaimer />
        </div>
        {content}
      </section>
    </AppShell>
  );
}

function SeasonDetail({ season }: { season: string }) {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Season archive"
        title={`ALCL ${season.replace("-", " ")}`}
        copy="Season schedule, milestones, and cumulative performance."
      />
      <section className="container">
        <EmptyState
          title="Season data not published"
          message="Schedule and standings for this season will appear here."
        />
      </section>
    </AppShell>
  );
}

async function TeamDetail({ id }: { id: string }) {
  const team = await getPublicTeam(id);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Team profile"
        title={team?.name ?? "Team not found"}
        copy={
          team
            ? `${team.memberCount} player${team.memberCount === 1 ? "" : "s"} · ${team.captainName ? `Captain ${team.captainName}` : "No captain listed"}`
            : "This team has not been registered yet, or the profile is not public."
        }
      />
      <section className="container">
        {team ? (
          <div className="card">
            <div className="team">
              <div className="avatar">{team.shortName.slice(0, 2).toUpperCase()}</div>
              <div>
                <h3 style={{ margin: 0 }}>{team.name}</h3>
                {team.captainName ? (
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>Captain · {team.captainName}</span>
                ) : null}
              </div>
            </div>
            <div className="meta" style={{ marginTop: 16 }}>
              <span>{team.memberCount} rostered player{team.memberCount === 1 ? "" : "s"}</span>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Team not found"
            message="This team has not been registered yet, or the profile is not public."
          />
        )}
      </section>
    </AppShell>
  );
}

async function PlayerDetail({ id }: { id: string }) {
  const profile = await getPlayerProfile(id);
  if (!profile) {
    return <PlayerProfileNotFound ref={id} />;
  }
  const user = await getCurrentUser();
  const isOwner = Boolean(user && profile.profileId === user.id);
  return <PlayerProfileView profile={profile} isOwner={isOwner} />;
}

function AdminPage({ section }: { section?: string }) {
  const name = section ? section[0].toUpperCase() + section.slice(1) : "Operations";
  return (
    <AppShell>
      <PageHeader
        eyebrow="Organizer console"
        title={name}
        copy="Competition administration with server-enforced policy checks and audit history."
      />
      <section className="container">
        <AdminActions title={name} />
        {section === "live-data" ? (
          <LiveApiAdmin />
        ) : (
          <EmptyState
            title="No records yet"
            message="Admin records will appear here as the league operates."
          />
        )}
        {!section || section === "registrations" || section === "matches" ? <AdminTable /> : null}
      </section>
    </AppShell>
  );
}

function AuthPage() {
  return (
    <AppShell>
      <div className="container" style={{ display: "grid", placeItems: "center", minHeight: "65vh" }}>
        <div className="card" style={{ width: "min(440px, 100%)" }}>
          <div className="eyebrow">Player sign in</div>
          <h3 style={{ fontSize: 30 }}>Sign in as a player</h3>
          <p className="legal">Teams do not have logins. Only players sign in.</p>
          <AuthForm />
        </div>
      </div>
    </AppShell>
  );
}
