import type {
  MatchResult,
  PointsAwardConfig,
  ScoreBreakdown,
  ScoringConfig,
  Standing,
  TiebreakRule,
} from "@/types/domain";

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

export function scoreMatchResult(result: MatchResult, config: ScoringConfig): ScoreBreakdown {
  if (!Number.isInteger(result.placement) || result.placement < 1) {
    throw new Error("Placement must be a positive integer.");
  }
  if (!Number.isInteger(result.kills) || result.kills < 0) {
    throw new Error("Kills must be a non-negative integer.");
  }
  const placementPoints = finite(config.placementPoints[result.placement] ?? 0, "Placement points");
  const killPoints = finite(result.kills * config.pointsPerKill, "Kill points");
  const bonusPoints = (result.bonuses ?? []).reduce(
    (sum, adjustment) =>
      sum + finite(adjustment.points, "Bonus") *
        (config.bonusCategoryMultipliers?.[adjustment.category] ?? 1),
    0,
  );
  const penaltyPoints = (result.penalties ?? []).reduce(
    (sum, adjustment) =>
      sum + Math.abs(finite(adjustment.points, "Penalty")) *
        (config.penaltyCategoryMultipliers?.[adjustment.category] ?? 1),
    0,
  );
  const multiplier = finite(result.multiplier ?? config.defaultMultiplier, "Multiplier");
  if (multiplier < 0) throw new Error("Multiplier cannot be negative.");
  const matchPoints = Math.max(
    config.minimumMatchPoints ?? 0,
    (placementPoints + killPoints + bonusPoints - penaltyPoints) * multiplier,
  );
  return {
    teamId: result.teamId, matchId: result.matchId, placementPoints, killPoints,
    bonusPoints, penaltyPoints, multiplier, matchPoints,
  };
}

type UnrankedStanding = Omit<Standing, "rank">;

export function compareStandings(
  a: UnrankedStanding,
  b: UnrankedStanding,
  rules: readonly TiebreakRule[],
): number {
  for (const rule of rules) {
    const left = rule.metric === "points" ? a.matchPoints : a[rule.metric];
    const right = rule.metric === "points" ? b.matchPoints : b[rule.metric];
    const comparison = typeof left === "string"
      ? left.localeCompare(String(right))
      : Number(left) - Number(right);
    if (comparison !== 0) return rule.direction === "asc" ? comparison : -comparison;
  }
  return a.teamId.localeCompare(b.teamId);
}

export function aggregateMatchStandings(
  results: readonly MatchResult[],
  config: ScoringConfig,
  tiebreakers: readonly TiebreakRule[],
  maxMatches?: number,
): readonly Standing[] {
  if (maxMatches !== undefined && (!Number.isInteger(maxMatches) || maxMatches < 0)) {
    throw new Error("maxMatches must be a non-negative integer.");
  }
  const grouped = new Map<string, MatchResult[]>();
  for (const result of results) {
    grouped.set(result.teamId, [...(grouped.get(result.teamId) ?? []), result]);
  }
  const counted = [...grouped.values()].flatMap((teamResults) =>
    [...teamResults]
      .sort((a, b) => {
        const points = scoreMatchResult(b, config).matchPoints - scoreMatchResult(a, config).matchPoints;
        return points || b.kills - a.kills || a.placement - b.placement ||
          a.sequence - b.sequence || a.matchId.localeCompare(b.matchId);
      })
      .slice(0, maxMatches ?? teamResults.length),
  ).sort(
    (a, b) => a.sequence - b.sequence ||
      a.matchId.localeCompare(b.matchId) ||
      a.teamId.localeCompare(b.teamId),
  );

  const byTeam = new Map<string, UnrankedStanding>();
  for (const result of counted) {
    const score = scoreMatchResult(result, config);
    const current = byTeam.get(result.teamId) ?? {
      teamId: result.teamId, matchPoints: 0, eventPoints: 0, seasonPoints: 0,
      kills: 0, wins: 0, bestPlacement: Number.POSITIVE_INFINITY,
      matchesPlayed: 0, lastMatchPoints: 0,
    };
    byTeam.set(result.teamId, {
      ...current,
      matchPoints: current.matchPoints + score.matchPoints,
      kills: current.kills + result.kills,
      wins: current.wins + (result.placement === 1 ? 1 : 0),
      bestPlacement: Math.min(current.bestPlacement, result.placement),
      matchesPlayed: current.matchesPlayed + 1,
      lastMatchPoints: score.matchPoints,
    });
  }
  return [...byTeam.values()]
    .sort((a, b) => compareStandings(a, b, tiebreakers))
    .map((standing, index) => ({ ...standing, rank: index + 1 }));
}

export function awardEventPoints(
  standings: readonly Standing[],
  awards: PointsAwardConfig,
): readonly Standing[] {
  return standings.map((standing) => ({
    ...standing,
    eventPoints: awards.byRank[standing.rank] ?? awards.defaultPoints,
  }));
}

export function aggregateSeasonStandings(
  eventStandings: readonly (readonly Standing[])[],
  seasonAwards: PointsAwardConfig,
  tiebreakers: readonly TiebreakRule[],
): readonly Standing[] {
  const byTeam = new Map<string, UnrankedStanding>();
  for (const event of eventStandings) {
    for (const standing of event) {
      const current = byTeam.get(standing.teamId) ?? {
        teamId: standing.teamId, matchPoints: 0, eventPoints: 0, seasonPoints: 0,
        kills: 0, wins: 0, bestPlacement: Number.POSITIVE_INFINITY,
        matchesPlayed: 0, lastMatchPoints: 0,
      };
      byTeam.set(standing.teamId, {
        ...current,
        matchPoints: current.matchPoints + standing.matchPoints,
        eventPoints: current.eventPoints + standing.eventPoints,
        seasonPoints: current.seasonPoints +
          (seasonAwards.byRank[standing.rank] ?? seasonAwards.defaultPoints),
        kills: current.kills + standing.kills,
        wins: current.wins + standing.wins,
        bestPlacement: Math.min(current.bestPlacement, standing.bestPlacement),
        matchesPlayed: current.matchesPlayed + standing.matchesPlayed,
        lastMatchPoints: standing.eventPoints,
      });
    }
  }
  const seasonRules: readonly TiebreakRule[] = [
    { metric: "points", direction: "desc" },
    ...tiebreakers.filter((rule) => rule.metric !== "points"),
  ];
  return [...byTeam.values()]
    .sort((a, b) => compareStandings(
      { ...a, matchPoints: a.seasonPoints },
      { ...b, matchPoints: b.seasonPoints },
      seasonRules,
    ))
    .map((standing, index) => ({ ...standing, rank: index + 1 }));
}
