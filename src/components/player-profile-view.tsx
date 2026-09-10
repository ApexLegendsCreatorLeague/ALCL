import Link from "next/link";
import { Crosshair, ExternalLink, MapPin, Pencil, Shield, Target, Trophy, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeader, StatCard } from "@/components/alcl";
import { hasTopLegends } from "@/lib/apex-legends";
import { hasAnySocialLinks, PLAYER_SOCIAL_FIELDS, socialLabelFromUrl } from "@/lib/social-links";
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

function SocialLinks({ profile }: { profile: PlayerProfile }) {
  if (!hasAnySocialLinks(profile)) {
    return null;
  }

  return (
    <div className="profile-socials">
      {PLAYER_SOCIAL_FIELDS.map((field) => {
        const url = profile[field.profileKey];
        if (!url) return null;
        return (
          <a
            key={field.platform}
            className={`profile-social-link ${field.cssClass}`}
            href={url}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} />
            {socialLabelFromUrl(url, field.platform) ?? field.label}
          </a>
        );
      })}
    </div>
  );
}

export function PlayerProfileView({
  profile,
  isOwner = false,
  saved = false,
}: {
  profile: PlayerProfile;
  isOwner?: boolean;
  saved?: boolean;
}) {
  const initials = profile.displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hasStats = profile.stats.matchesPlayed > 0;
  const topLegends = profile.recruitment.topLegends.filter(Boolean) as string[];

  return (
    <AppShell>
      <section className="profile-hero">
        <div className="container">
          {saved ? <div className="profile-save-banner">Profile updated.</div> : null}
          <div className="profile-hero-top">
            {isOwner ? (
              <Link className="btn btn-primary profile-edit-btn" href={`/players/${profile.playerId}/edit`}>
                <Pencil size={15} />
                Edit Profile
              </Link>
            ) : null}
          </div>
          <div className="profile-hero-grid">
            <div className="profile-identity">
              <div className="profile-avatar">{initials}</div>
              <div>
                <p className="eyebrow">ALCL Competitor</p>
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
                  <span className="profile-team-link muted">Free Agent</span>
                )}
                <SocialLinks profile={profile} />
              </div>
            </div>
            <div className="profile-hero-stats">
              <StatTile label="Matches" value={String(profile.stats.matchesPlayed)} />
              <StatTile label="Kills" value={formatNumber(profile.stats.kills)} />
              <StatTile label="Avg Placement" value={profile.stats.avgPlacement?.toString() ?? "—"} />
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
              <p className="eyebrow">Career Totals</p>
              <h2>Combat &amp; Results</h2>
            </div>
            <span className="badge">Verified ALCL Matches</span>
          </div>
          {hasStats ? (
            <div className="grid grid-4">
              <StatCard label="Kills" value={formatNumber(profile.stats.kills)} />
              <StatCard label="Assists" value={formatNumber(profile.stats.assists)} />
              <StatCard label="Knocks" value={formatNumber(profile.stats.knocks)} />
              <StatCard label="Damage" value={formatNumber(profile.stats.damage)} />
              <StatCard label="Kills / Match" value={profile.stats.avgKills.toFixed(1)} />
              <StatCard label="Damage / Match" value={formatNumber(profile.stats.avgDamage)} />
              <StatCard label="Best Placement" value={profile.stats.bestPlacement?.toString() ?? "—"} />
              <StatCard label="Top 5 Finishes" value={String(profile.stats.top5)} />
            </div>
          ) : (
            <EmptyState
              title="No Verified Match Stats Yet"
              message="Kills, damage, placement, and tournament history will populate after this player competes in verified ALCL matches."
            />
          )}
        </div>

        <div className="profile-split">
          <div className="profile-section">
            <div className="section-head">
              <div>
                <p className="eyebrow">Recent Matches</p>
                <h2>Match Log</h2>
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
                title="No Match History"
                message="Recent verified performances will appear here once this player completes ALCL matches."
              />
            )}
          </div>

          <aside className="profile-sidebar">
            <div className="card profile-side-card">
              <p className="eyebrow">Competitor Info</p>
              <ul className="profile-facts">
                <li>
                  <Shield size={15} />
                  <span>Member Since</span>
                  <strong>{formatDate(profile.memberSince)}</strong>
                </li>
                <li>
                  <Target size={15} />
                  <span>Platform</span>
                  <strong>{profile.platform ?? "—"}</strong>
                </li>
                <li>
                  <Crosshair size={15} />
                  <span>Rank Snapshot</span>
                  <strong>{profile.rank ?? "Not Set"}</strong>
                </li>
                <li>
                  <MapPin size={15} />
                  <span>Region</span>
                  <strong>{profile.countryCode ?? "—"}</strong>
                </li>
                <li>
                  <Trophy size={15} />
                  <span>Tournaments Entered</span>
                  <strong>{profile.stats.tournamentsEntered}</strong>
                </li>
              </ul>
              <SocialLinks profile={profile} />
            </div>

            <div className="card profile-side-card">
              <p className="eyebrow">Tournament Entries</p>
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
              <div className="profile-recruitment-head">
                <p className="eyebrow">Team Recruitment</p>
                {profile.recruitment.lookingForTeam ? (
                  <span className="badge badge-live">Open to Offers</span>
                ) : null}
              </div>
              {profile.recruitment.recruitmentPitch ||
              hasTopLegends(profile.recruitment.topLegends) ||
              profile.recruitment.availability ? (
                <>
                  {topLegends.length ? (
                    <div className="profile-legend-block">
                      <p className="profile-recruitment-meta">
                        <strong>Top Legends Used</strong>
                      </p>
                      <ol className="profile-legend-list">
                        {topLegends.map((legend) => (
                          <li key={legend}>{legend}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                  {profile.recruitment.availability ? (
                    <p className="profile-recruitment-meta">
                      <strong>Availability:</strong> {profile.recruitment.availability}
                    </p>
                  ) : null}
                  {profile.recruitment.recruitmentPitch ? (
                    <p className="profile-recruitment-pitch">{profile.recruitment.recruitmentPitch}</p>
                  ) : null}
                </>
              ) : profile.teamName ? (
                <p className="legal">Already rostered with {profile.teamName}.</p>
              ) : (
                <p className="legal">
                  This player has not published recruitment details yet.
                  {isOwner ? " Use Edit Profile to tell captains why they should pick you up." : null}
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}

export function PlayerProfileNotFound({ lookupRef }: { lookupRef: string }) {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Player Profile"
        title="Player Not Found"
        copy="This profile is unavailable or has not been published yet."
      />
      <section className="container">
        <EmptyState
          title="Profile Unavailable"
          message={`No public ALCL profile matches "${lookupRef}". Registered players appear in the directory after account setup completes.`}
        />
        <div className="actions" style={{ marginTop: 20 }}>
          <Link className="btn btn-primary" href="/players">
            Back to Players
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
