import Link from "next/link";
import { ArrowRight, CalendarDays, Crosshair, MapPin, Trophy, Users } from "lucide-react";
import { Card, StatusBadge } from "@/components/ui";

export function TournamentCard({
  tournament,
}: {
  tournament: {
    id: string;
    name: string;
    date: string;
    status: string;
    format: string;
    teams: number;
    description: string;
  };
}) {
  return (
    <Card className="tournament-card">
      <div className="card-topline">
        <StatusBadge status={tournament.status} />
        <span className="event-code">COMMUNITY EVENT</span>
      </div>
      <div>
        <p className="eyebrow">ALCL Season One</p>
        <h3>{tournament.name}</h3>
        <p>{tournament.description}</p>
      </div>
      <div className="card-meta">
        <span><CalendarDays size={16} /> {tournament.date}</span>
        <span><Users size={16} /> {tournament.teams}/20 teams</span>
        <span><Crosshair size={16} /> {tournament.format}</span>
      </div>
      <div className="card-actions">
        <Link href={`/tournaments/${tournament.id}`}>View tournament <ArrowRight size={16} /></Link>
        <Link href="/rules">Rules</Link>
      </div>
    </Card>
  );
}

export function TeamCard({
  team,
}: {
  team: {
    id: string;
    name: string;
    abbreviation: string;
    region: string;
    seasonPoints: number;
    rank: number;
  };
}) {
  return (
    <Link href={`/teams/${team.id}`} className="team-card card">
      <span className="team-avatar">{team.abbreviation}</span>
      <div>
        <small>#{team.rank} · {team.region}</small>
        <h3>{team.name}</h3>
        <p>{team.seasonPoints} season points</p>
      </div>
      <ArrowRight size={18} />
    </Link>
  );
}

export function PlayerCard({
  player,
}: {
  player: {
    id: string;
    displayName: string;
    team: string;
    role: string;
    kills: number;
  };
}) {
  return (
    <Link href={`/players/${player.id}`} className="player-card card">
      <span className="player-avatar">{player.displayName.slice(0, 2).toUpperCase()}</span>
      <div>
        <small>{player.role} · {player.team}</small>
        <h3>{player.displayName}</h3>
      </div>
      <strong>{player.kills}<small> KILLS</small></strong>
    </Link>
  );
}

export function MatchCard({
  match,
}: {
  match: { number: number; map: string; winner: string; score: number; status: string };
}) {
  return (
    <Card className="match-card">
      <div>
        <span className="match-number">M{match.number}</span>
        <div>
          <small>{match.status} · {match.map}</small>
          <h3>{match.winner}</h3>
        </div>
      </div>
      <div className="match-score">
        <Trophy size={17} />
        <strong>{match.score}</strong>
        <small>PTS</small>
      </div>
    </Card>
  );
}

export function SupporterCard({
  supporter,
}: {
  supporter: { name: string; description: string };
}) {
  return (
    <Card className="supporter-card">
      <span className="supporter-mark">{supporter.name.slice(0, 2).toUpperCase()}</span>
      <div>
        <small>COMMUNITY SUPPORTER</small>
        <h3>{supporter.name}</h3>
        <p>{supporter.description}</p>
      </div>
    </Card>
  );
}

export function RankBadge({ rank }: { rank: string }) {
  return <span className={`rank-badge rank-${rank.toLowerCase()}`}>{rank}</span>;
}

export function QualificationProgress({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="qualification-progress">
      <div><span>{label}</span><strong>{value}%</strong></div>
      <div className="progress-track"><i style={{ width: `${value}%` }} /></div>
    </div>
  );
}

export function Countdown() {
  return (
    <div className="countdown" aria-label="Tournament begins in six days">
      {[["06", "Days"], ["14", "Hours"], ["32", "Minutes"], ["18", "Seconds"]].map(
        ([value, label]) => (
          <div key={label}><strong>{value}</strong><span>{label}</span></div>
        ),
      )}
    </div>
  );
}

export function TournamentTimeline() {
  return (
    <ol className="timeline">
      {[
        ["Sep 5", "Registration opens"],
        ["Sep 9", "Roster lock"],
        ["Sep 11", "Manager check-in"],
        ["Sep 12", "Community event"],
        ["Sep 13", "Audited results published"],
      ].map(([date, label], index) => (
        <li key={label} className={index === 0 ? "active" : ""}>
          <i />
          <span>{date}</span>
          <strong>{label}</strong>
        </li>
      ))}
    </ol>
  );
}

export function LocationLabel({ children }: { children: React.ReactNode }) {
  return <span className="location-label"><MapPin size={15} />{children}</span>;
}
