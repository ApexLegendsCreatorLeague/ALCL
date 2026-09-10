import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { AuthCtaButtons } from "@/components/auth-cta-buttons";
import {
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
import { PlayerProfileNotFound, PlayerProfileView } from "@/components/player-profile-view";
import { PlayersDirectory } from "@/components/players-directory";
import { getCurrentUser } from "@/server/auth";
import { getPlayerProfile } from "@/server/player-profile";
import { getPublicTeam, listPublicPlayers, listPublicTeams } from "@/server/public-directory";

export async function HomePage() {
  const [players, teams] = await Promise.all([listPublicPlayers(5), listPublicTeams(5)]);
  return (
    <AppShell>
      <section className="hero">
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div className="eyebrow">ALCL Community League</div>
          <h1 className="display">
            THE ARENA
            <br />
            <span style={{ color: "var(--lime)" }}>BELONGS TO YOU.</span>
          </h1>
          <p>
            Independent community tournaments for Apex Legends. Compete in structured seasons, build
            your legacy, and earn your place at the ALCL Championship.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionTitle
            eyebrow="Next Up"
            title="Enter The Circuit"
            copy="Tournaments, Standings, and Schedules will appear here as Organizers publish them."
            action={
              <Link className="btn" href="/tournaments">
                View Tournaments
              </Link>
            }
          />
          <EmptyState
            title="No Tournaments Published Yet"
            message="Check back soon - the first ALCL events are being prepared."
          />
        </div>
      </section>

      <section className="section" style={{ background: "#0b0e13" }}>
        <div className="container">
          <SectionTitle
            eyebrow="Season Leaderboard"
            title="Standings"
            action={
              <Link className="btn" href="/standings">
                Full Standings
              </Link>
            }
          />
          <EmptyState
            title="No Standings Yet"
            message="Season standings will appear after the first completed event."
          />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionTitle
            eyebrow="Community"
            title="Teams & Players"
            copy="Registered Teams and Player Profiles appear here as the league grows."
            action={
              players.length || teams.length ? (
                <div className="actions" style={{ marginTop: 0 }}>
                  <Link className="btn" href="/players">
                    View All Players
                  </Link>
                  <Link className="btn" href="/teams">
                    View All Teams
                  </Link>
                </div>
              ) : undefined
            }
          />
          {players.length || teams.length ? (
            <div className="home-spotlight">
              {players.length ? (
                <div className="home-spotlight-row">
                  <p className="home-spotlight-label">Latest Players</p>
                  <div className="home-spotlight-grid">
                    {players.map((player) => (
                      <PlayerCard
                        key={player.playerId}
                        playerId={player.playerId}
                        name={player.displayName}
                        teamName={player.teamName}
                        platform={player.platform}
                        rank={player.rank}
                        spotlight
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {teams.length ? (
                <div className="home-spotlight-row">
                  <p className="home-spotlight-label">Latest Teams</p>
                  <div className="home-spotlight-grid">
                    {teams.map((team) => (
                      <TeamCard
                        key={team.teamId}
                        teamId={team.teamId}
                        name={team.name}
                        shortName={team.shortName}
                        captainName={team.captainName}
                        memberCount={team.memberCount}
                        spotlight
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="No Teams or Players Listed Yet"
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
    "ALCL League",
    "The ALCL League",
    "Season Schedule, Milestones, and Cumulative Performance will be published here.",
  ],
  tournaments: [
    "Competition Hub",
    "Find Your Next Fight",
    "Browse Open Registrations, Live Events, and completed Community Tournaments.",
  ],
  standings: [
    "Season Standings",
    "Every Point Matters",
    "Cumulative Standings across The ALCL Season Circuit.",
  ],
  teams: [
    "Team Directory",
    "Built To Compete",
    "Discover Squads and follow their path through the Circuit.",
  ],
  players: [
    "Player Directory",
    "Meet The Competitors",
    "Profiles, Performance Snapshots, and Team Affiliations for ALCL Competitors.",
  ],
  championship: [
    "The Final Stage",
    "ALCL Championship",
    "The Season’s best Teams converge for one decisive weekend.",
  ],
  supporters: [
    "Community Powered",
    "ALCL Supporters",
    "The people and groups helping independent competition thrive.",
  ],
  rules: [
    "Competition Guide",
    "Rules & Format",
    "Clear standards for fair, consistent, and community-first competition.",
  ],
  "hall-of-fame": [
    "ALCL History",
    "Hall of Fame",
    "Celebrating champions, record breakers, and unforgettable seasons.",
  ],
  legal: [
    "Policies",
    "Legal & Integrity",
    "How ALCL operates, protects competitors, and communicates its independent status.",
  ],
  dashboard: [
    "Competitor Portal",
    "Your Dashboard",
    "Your season at a glance: registrations, matches, and account actions.",
  ],
};

function StandardHeader({ type }: { type: string }) {
  const data = info[type] ?? ["ALCL", "Competition Center", "Everything you need for the current ALCL season."];
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
        title="No Tournaments published yet"
        message="Organizers will publish Events here when registration opens."
      />
    );
  } else if (type === "teams") {
    const teams = await listPublicTeams();
    content = (
      <>
        <div className="toolbar">
          <Search placeholder="Search Teams…" />
          <div className="actions" style={{ marginTop: 0 }}>
            <AuthCtaButtons createTeamOnly compact />
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
            title="No Teams Registered Yet"
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
        title="No Standings Yet"
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
        title="Championship Field Not Set"
        message="Qualified teams will appear here during the season."
      />
    );
  } else if (type === "supporters") {
    content = (
      <EmptyState
        title="No Supporters Published Yet"
        message="Community supporters will be listed here once approved."
      />
    );
  } else if (type === "hall-of-fame") {
    content = (
      <EmptyState
        title="Hall of Fame Is Empty"
        message="Season champions and record holders will be recorded here."
      />
    );
  } else if (type === "rules") {
    content = (
      <>
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>ALCL Competition Rules</h3>
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
      <EmptyState title="Nothing Published Yet" message="Content for this section is coming soon." />
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
        <StatusBadge status="Coming Soon" />
        <h3>Player Registration</h3>
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
        title="Event Not Published Yet"
        message={`Details for ${title} will appear when organizers publish this tournament.`}
      />
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="ALCL Community Tournament"
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
        eyebrow="Season Archive"
        title={`ALCL ${season.replace("-", " ")}`}
        copy="Season schedule, milestones, and cumulative performance."
      />
      <section className="container">
        <EmptyState
          title="Season Data Not Published"
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
        eyebrow="Team Profile"
        title={team?.name ?? "Team Not Found"}
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
            title="Team Not Found"
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
    return <PlayerProfileNotFound lookupRef={id} />;
  }
  const user = await getCurrentUser();
  const isOwner = Boolean(user && profile.profileId === user.id);
  return <PlayerProfileView profile={profile} isOwner={isOwner} />;
}

function AuthPage() {
  return (
    <AppShell>
      <div className="container" style={{ display: "grid", placeItems: "center", minHeight: "65vh" }}>
        <div className="card" style={{ width: "min(440px, 100%)" }}>
          <div className="eyebrow">Sign In</div>
          <h3 style={{ fontSize: 30 }}>Sign In as a Player</h3>
          <p className="legal">Teams do not have logins. Only players sign in.</p>
          <AuthForm />
        </div>
      </div>
    </AppShell>
  );
}
