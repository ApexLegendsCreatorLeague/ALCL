"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  Search as SearchIcon,
  Shield,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useNavSessionReady, useNavUser } from "@/components/auth-session-provider";

export function LegalDisclaimer() {
  return <p className="legal">This tournament is not affiliated with or sponsored by Electronic Arts Inc.</p>;
}

export function Footer() {
  const user = useNavUser();
  const ready = useNavSessionReady();
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="brand">
              <span className="brand-mark">A</span>ALCL
            </div>
            <p style={{ color: "var(--muted)", maxWidth: 410, lineHeight: 1.6 }}>
              Independent community tournaments for Apex Legends. Built for competitors, organizers, and fans.
            </p>
          </div>
          <div className="footer-links">
            <strong style={{ color: "white" }}>Compete</strong>
            <Link href="/tournaments">Tournaments</Link>
            <Link href="/standings">Standings</Link>
            <Link href="/rules">Rules</Link>
            <Link href="/teams">Teams</Link>
          </div>
          <div className="footer-links">
            <strong style={{ color: "white" }}>Players</strong>
            {!ready ? null : user ? (
              <>
                <Link href="/players/me">My Profile</Link>
                <Link href="/dashboard/team/create">Create a Team</Link>
                <Link href="/dashboard">Dashboard</Link>
              </>
            ) : (
              <>
                <Link href="/login">Sign In</Link>
                <Link href="/register">Create Player Account</Link>
                <Link href="/login?next=/dashboard/team/create">Create a Team</Link>
              </>
            )}
          </div>
          <div className="footer-links">
            <strong style={{ color: "white" }}>ALCL</strong>
            <Link href="/championship">Championship</Link>
            <Link href="/hall-of-fame">Hall of Fame</Link>
            <Link href="/supporters">Supporters</Link>
            <Link href="/legal">Legal</Link>
          </div>
        </div>
        <LegalDisclaimer />
      </div>
    </footer>
  );
}

export function StatusBadge({ status = "Coming Soon" }: { status?: string }) {
  const live = /live|open|active/i.test(status);
  return (
    <span className={`badge ${live ? "badge-live" : "badge-warn"}`}>
      {live && "● "}
      {status}
    </span>
  );
}

export function RankBadge({ rank }: { rank: number }) {
  return <span className={`rank ${rank < 4 ? "top" : ""}`}>{rank.toString().padStart(2, "0")}</span>;
}

export function Countdown() {
  return (
    <div className="meta">
      <span>Schedule will be posted before the next event.</span>
    </div>
  );
}

export function Hero() {
  const user = useNavUser();
  const ready = useNavSessionReady();
  return (
    <section className="hero">
      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <div className="eyebrow">ALCL Community League</div>
        <h1 className="display">
          THE ARENA
          <br />
          <span style={{ color: "var(--lime)" }}>BELONGS TO YOU.</span>
        </h1>
        <p>
          Independent community tournaments for Apex Legends. Compete in structured seasons, build your
          legacy, and earn your place at the ALCL Championship.
        </p>
        <div className="actions">
          {!ready ? null : user ? (
            <>
              <Link className="btn btn-primary" href="/players/me">
                My Profile <ArrowRight size={15} />
              </Link>
              <Link className="btn" href="/dashboard/team/create">
                Create a Team
              </Link>
              <Link className="btn btn-ghost" href="/tournaments">
                Explore Tournaments
              </Link>
            </>
          ) : (
            <>
              <Link className="btn btn-primary" href="/register">
                Register <ArrowRight size={15} />
              </Link>
              <Link className="btn" href="/login">
                Sign In
              </Link>
              <Link className="btn btn-ghost" href="/tournaments">
                Explore Tournaments
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

type CardProps = { name?: string; index?: number };

export function TournamentCard({ name = "ALCL event" }: CardProps) {
  return (
    <div className="card card-accent">
      <StatusBadge status="Coming Soon" />
      <h3>{name}</h3>
      <p>Event details will appear here once organizers publish the next tournament.</p>
    </div>
  );
}

export function TeamCard({
  name = "Team",
  teamId,
  shortName,
  captainName,
  memberCount,
  compact = false,
  spotlight = false,
}: CardProps & {
  teamId?: string;
  shortName?: string;
  captainName?: string | null;
  memberCount?: number;
  compact?: boolean;
  spotlight?: boolean;
}) {
  const body = (
    <>
      <div className="team">
        <div className="avatar">{(shortName ?? name).slice(0, 2).toUpperCase()}</div>
        <div className="directory-card-copy">
          <h3>{name}</h3>
          {compact || spotlight ? (
            memberCount !== undefined ? (
              <span className="directory-card-sub">
                {memberCount} player{memberCount === 1 ? "" : "s"}
              </span>
            ) : null
          ) : captainName ? (
            <span className="directory-card-sub">Captain · {captainName}</span>
          ) : null}
        </div>
      </div>
      {!compact && !spotlight && memberCount !== undefined ? (
        <div className="meta">
          <span>{memberCount} player{memberCount === 1 ? "" : "s"}</span>
        </div>
      ) : null}
    </>
  );

  const cardClass = spotlight
    ? "card directory-card directory-card-spotlight"
    : compact
      ? "card directory-card directory-card-compact"
      : "card directory-card";

  if (teamId) {
    return (
      <Link href={`/teams/${teamId}`} className={cardClass}>
        {body}
        {!spotlight ? (
          <ChevronRight className="directory-card-chevron" size={compact ? 16 : 18} aria-hidden="true" />
        ) : null}
      </Link>
    );
  }

  return <div className="card">{body}</div>;
}

export function PlayerCard({
  name = "Player",
  playerId,
  teamName,
  platform,
  rank,
  compact = false,
  spotlight = false,
}: CardProps & {
  playerId?: string;
  teamName?: string | null;
  platform?: string | null;
  rank?: string | null;
  compact?: boolean;
  spotlight?: boolean;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const compactSub = teamName ?? platform ?? rank ?? null;

  const body = (
    <>
      <div className="team">
        <div className="avatar">{initials}</div>
        <div className="directory-card-copy">
          <h3>{name}</h3>
          {compact || spotlight ? (
            compactSub ? <span className="directory-card-sub">{compactSub}</span> : null
          ) : teamName ? (
            <span className="directory-card-sub directory-card-sub-accent">{teamName}</span>
          ) : null}
        </div>
      </div>
      {!compact && !spotlight && (platform || rank) ? (
        <div className="meta">
          {platform ? <span>{platform}</span> : null}
          {rank ? <span>{rank}</span> : null}
        </div>
      ) : null}
    </>
  );

  const cardClass = spotlight
    ? "card directory-card directory-card-spotlight"
    : compact
      ? "card directory-card directory-card-compact"
      : "card directory-card";

  if (playerId) {
    return (
      <Link href={`/players/${playerId}`} className={cardClass}>
        {body}
        {!spotlight ? (
          <ChevronRight className="directory-card-chevron" size={compact ? 16 : 18} aria-hidden="true" />
        ) : null}
      </Link>
    );
  }

  return <div className="card">{body}</div>;
}

export function SupporterCard({ name = "Supporter" }: CardProps) {
  return (
    <div className="card">
      <div className="avatar">
        <Shield size={18} />
      </div>
      <h3>{name}</h3>
      <p>Community supporters will be listed here once published.</p>
    </div>
  );
}

export function PlayerStats() {
  return null;
}

export function StatCard({ label, value, change }: { label: string; value: string; change?: string }) {
  return (
    <div className="card stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {change ? <small style={{ color: "var(--lime)" }}>{change}</small> : null}
    </div>
  );
}

export function StandingsTable() {
  return (
    <EmptyState
      title="No Standings Yet"
      message="Season standings will appear after the first completed event."
    />
  );
}

export function ScoreTable() {
  return (
    <EmptyState title="No Match Results Yet" message="Results will appear after matches are recorded." />
  );
}

export function Leaderboard() {
  return <StandingsTable />;
}

export function AdminTable() {
  return (
    <EmptyState
      title="Nothing to Review"
      message="Registrations, matches, and other admin records will appear here."
    />
  );
}

export function MatchCard() {
  return (
    <EmptyState title="No Matches Scheduled" message="Match cards will appear once events are published." />
  );
}

export function QualificationProgress() {
  return (
    <div className="card">
      <strong>Championship Qualification</strong>
      <p>Qualification Tracking will begin once the Season is underway.</p>
    </div>
  );
}

export function TournamentTimeline() {
  return (
    <EmptyState
      title="No Schedule Published"
      message="Organizers will publish the event timeline before registration opens."
    />
  );
}

export function TeamRoster() {
  return <EmptyState title="No Roster Yet" message="Registered players will appear on the team roster." />;
}

export function Search({ placeholder = "Search ALCL…" }: { placeholder?: string }) {
  const [query, setQuery] = useState("");
  return (
    <div className="search">
      <SearchIcon className="search-icon" size={17} />
      <input
        className="input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}

export function Modal({
  title = "Confirm Action",
  children,
  onClose,
}: {
  title?: string;
  children?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="card modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="btn btn-ghost" onClick={onClose} style={{ float: "right" }}>
          <X size={15} />
        </button>
        <h3>{title}</h3>
        {children}
        <div className="actions">
          <button className="btn btn-primary" onClick={onClose}>
            Confirm
          </button>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ message, onClose }: { message: string; onClose?: () => void }) {
  useEffect(() => {
    if (!onClose) return;
    const id = setTimeout(onClose, 2500);
    return () => clearTimeout(id);
  }, [onClose]);
  return <div className="toast">✓ {message}</div>;
}

export function EmptyState({ title = "Nothing Here Yet", message }: { title?: string; message?: string }) {
  return (
    <div className="state">
      <Trophy size={28} />
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="state">
      <div className="spinner" />
      Loading…
    </div>
  );
}

export function ErrorState() {
  return (
    <div className="state">
      <X size={28} />
      <h3>Couldn&apos;t Load This View</h3>
      <button className="btn">Try Again</button>
    </div>
  );
}

export function AdminActions({ title }: { title: string }) {
  return (
    <div className="toolbar">
      <Search placeholder={`Search ${title.toLowerCase()}…`} />
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        {copy ? <p>{copy}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="page-head">
      <div className="container">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
    </div>
  );
}

export function BroadcastView({ type }: { type: string }) {
  return (
    <div className="broadcast">
      <div className="broadcast-panel">
        <div className="eyebrow">ALCL · Public Streaming Overlay</div>
        <h2 className="display" style={{ fontSize: 42, margin: "10px 0" }}>
          {type.toUpperCase()}
        </h2>
        <EmptyState
          title="No Broadcast Data"
          message="Live overlay data will appear when an event is in progress."
        />
        <p className="legal">This tournament is not affiliated with or sponsored by Electronic Arts Inc.</p>
      </div>
    </div>
  );
}
