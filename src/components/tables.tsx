import Link from "next/link";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { StatusBadge } from "@/components/ui";

type Standing = {
  id: string;
  rank: number;
  name: string;
  abbreviation: string;
  eventsPlayed: number;
  wins: number;
  top5: number;
  kills: number;
  eventPoints: number;
  seasonPoints: number;
  movement: number;
};

export function StandingsTable({
  standings,
  compact = false,
}: {
  standings: Standing[];
  compact?: boolean;
}) {
  const shown = compact ? standings.slice(0, 8) : standings;
  return (
    <div className="table-wrap">
      <table className="standings-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>Events</th>
            <th>Wins</th>
            <th>Top 5</th>
            <th>Kills</th>
            <th>Event Pts</th>
            <th>Season Pts</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((team) => (
            <tr key={team.id}>
              <td>
                <span className="rank-cell">{team.rank.toString().padStart(2, "0")}</span>
              </td>
              <td>
                <Link className="table-team" href={`/teams/${team.id}`}>
                  <span>{team.abbreviation}</span>
                  <strong>{team.name}</strong>
                </Link>
              </td>
              <td>{team.eventsPlayed}</td>
              <td>{team.wins}</td>
              <td>{team.top5}</td>
              <td>{team.kills}</td>
              <td>{team.eventPoints}</td>
              <td><strong className="accent-number">{team.seasonPoints}</strong></td>
              <td>
                <Movement value={team.movement} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Movement({ value }: { value: number }) {
  if (value > 0) return <span className="movement up"><ArrowUp size={14} />{value}</span>;
  if (value < 0) return <span className="movement down"><ArrowDown size={14} />{Math.abs(value)}</span>;
  return <span className="movement"><Minus size={14} /></span>;
}

export function ScoreTable({
  rows,
}: {
  rows: Array<{ label: string; placement: number; kills: number; total: number }>;
}) {
  return (
    <div className="table-wrap">
      <table className="score-table">
        <thead><tr><th>Team</th><th>Placement</th><th>Kills</th><th>Match Points</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}><td><strong>{row.label}</strong></td><td>{row.placement}</td><td>{row.kills}</td><td><strong>{row.total}</strong></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminTable({
  rows,
}: {
  rows: Array<{ name: string; meta: string; status: string; href?: string }>;
}) {
  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead><tr><th>Name</th><th>Details</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td><strong>{row.name}</strong></td>
              <td>{row.meta}</td>
              <td><StatusBadge status={row.status} /></td>
              <td><Link href={row.href ?? "#"}>Manage</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Leaderboard({
  standings,
}: {
  standings: Standing[];
}) {
  return (
    <div className="podium-grid">
      {standings.slice(0, 3).map((team) => (
        <Link className={`podium-card place-${team.rank}`} href={`/teams/${team.id}`} key={team.id}>
          <span>{team.abbreviation}</span>
          <small>#{team.rank}</small>
          <h3>{team.name}</h3>
          <strong>{team.seasonPoints} PTS</strong>
        </Link>
      ))}
    </div>
  );
}
