import Link from "next/link";
import { Crosshair, MapPin, Shield, Swords, Target, Trophy, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeader, StatCard } from "@/components/alcl";
import type { PlayerProfile } from "@/server/player-profile";

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="profile-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

export function PlayerProfileView({ profile }: { profile: PlayerProfile }) {
  const initials = profile.displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hasStats = profile.stats.matchesPlayed > 0;

  return (
    <AppShell>
      <section className="profile-hero">
        <div className="container">
          <div className="profile-hero-grid">
            <div className="profile-identity">
              <div className="profile-avatar">{initials}</div>
              <div>
                <p className="eyebrow">ALCL competitor</p>
                <h1>{profile.displayName}</h1>
                <div className="profile-tags">
                  {profile.username ? <span>@{profile.username}</span> : null}
                  {profile.platform ? <span>{profile.platform}</span> : null}
                  {profile.rank ? <span>{profile.rank}</span> : null}
                  {profile.countryCode ? <span>{profile.countryCode}</span> : null}
                </div>
                {profile.teamName && profile.teamId ? (
                  <Link href={`/teams/${profile.teamId}`} className="profile-team-link">
                    <Users size={15} />
                    {profile.teamName}
                  </Link>
                ) : (
                  <span className="profile-team-link muted">Free agent</span>
                )}
              </div>
            </div>
            <div className="profile-hero-stats">
              <StatTile label="Matches" value={String(profile.stats.matchesPlayed)} />
              <StatTile label="Kills" value={formatNumber(profile.stats.kills)} />
              <StatTile label="Avg placement" value={profile.stats.avgPlacement?.toString() ?? "—"} />
              <StatTile label="Wins" value={String(profile.stats.wins)} />
            </div>
          </div>
          {profile.bio ? <p className="profile-bio">{profile.bio}</p> : null}
        </div>
      </section>

      <section className="container profile-body">
        <div className="profile-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Career totals</p>
              <h2>Combat &amp; results</h2>
            </div>
            <span className="badge">Verified ALCL matches</span>
          </div>
          {hasStats ? (
            <div className="grid grid-4">
              <StatCard label="Kills" value={formatNumber(profile.stats.kills)} />
              <StatCard label="Assists" value={formatNumber(profile.stats.assists)} />
              <StatCard label="Knocks" value={formatNumber(profile.stats.knocks)} />
              <StatCard label="Damage" value={formatNumber(profile.stats.damage)} />
              <StatCard label="Kills / match" value={profile.stats.avgKills.toFixed(1)} />
              <StatCard label="Damage / match" value={formatNumber(profile.stats.avgDamage)} />
              <StatCard label="Best placement" value={profile.stats.bestPlacement?.toString() ?? "—"} />
              <StatCard label="Top 5 finishes" value={String(profile.stats.top5)} />
            </div>
          ) : (
            <EmptyState
              title="No verified match stats yet"
              message="Kills, damage, placement, and tournament history will populate after this player competes in verified ALCL matches."
            />
          )}
        </div>

        <div className="profile-split">
          <div className="profile-section">
            <div className="section-head">
              <div>
                <p className="eyebrow">Recent matches</p>
                <h2>Match log</h2>
              </div>
            </div>
            {profile.recentMatches.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Match</th>
                      <th>Team</th>
                      <th>Placement</th>
                      <th>K</th>
                      <th>A</th>
                      <th>Knocks</th>
                      <th>Damage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.recentMatches.map((match) => (
                      <tr key={`${match.matchId}-${match.playedAt}`}>
                        <td>
                          <strong>{match.matchLabel}</strong>
                          <div className="table-sub">
                            {match.tournamentName ?? match.eventName ?? "ALCL event"}
                            {match.map ? ` · ${match.map}` : ""}
                          </div>
                        </td>
                        <td>{match.teamName ?? "—"}</td>
                        <td>{match.placement ? `#${match.placement}` : "—"}</td>
                        <td>{match.kills}</td>
                        <td>{match.assists}</td>
                        <td>{match.knocks}</td>
                        <td>{formatNumber(match.damage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No match history"
                message="Recent verified performances will appear here once this player completes ALCL matches."
              />
            )}
          </div>

          <aside className="profile-sidebar">
            <div className="card profile-side-card">
              <p className="eyebrow">Competitor info</p>
              <ul className="profile-facts">
                <li>
                  <Shield size={15} />
                  <span>Member since</span>
                  <strong>{formatDate(profile.memberSince)}</strong>
                </li>
                <li>
                  <Target size={15} />
                  <span>Platform</span>
                  <strong>{profile.platform ?? "—"}</strong>
                </li>
                <li>
                  <Crosshair size={15} />
                  <span>Rank snapshot</span>
                  <strong>{profile.rank ?? "Not set"}</strong>
                </li>
                <li>
                  <MapPin size={15} />
                  <span>Region</span>
                  <strong>{profile.countryCode ?? "—"}</strong>
                </li>
                <li>
                  <Trophy size={15} />
                  <span>Tournaments entered</span>
                  <strong>{profile.stats.tournamentsEntered}</strong>
                </li>
              </ul>
            </div>

            <div className="card profile-side-card">
              <p className="eyebrow">Tournament entries</p>
              {profile.tournaments.length ? (
                <ul className="profile-tournament-list">
                  {profile.tournaments.map((entry) => (
                    <li key={entry.tournamentId}>
                      <Link href={`/tournaments/${entry.tournamentId}`}>{entry.name}</Link>
                      <span>{entry.status.replaceAll("_", " ")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="legal">No tournament registrations yet.</p>
              )}
            </div>

            <div className="card profile-side-card">
              <p className="eyebrow">Scouting notes</p>
              <p className="legal">
                Deaths are not tracked in ALCL match feeds yet. Focus on kills, assists, knocks,
                damage, and team placement when evaluating tournament performance.
              </p>
              <div className="profile-scout-icons">
                <Swords size={16} />
                <Crosshair size={16} />
                <Trophy size={16} />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}

export function PlayerProfileNotFound({ ref }: { ref: string }) {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Player profile"
        title="Player not found"
        copy="This profile is unavailable or has not been published yet."
      />
      <section className="container">
        <EmptyState
          title="Profile unavailable"
          message={`No public ALCL profile matches "${ref}". Registered players appear in the directory after account setup completes.`}
        />
        <div className="actions" style={{ marginTop: 20 }}>
          <Link className="btn btn-primary" href="/players">
            Back to players
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
