import { describe, expect, it } from "vitest";
import type { MatchResult, ScoringConfig, TiebreakRule } from "@/types/domain";
import {
  aggregateMatchStandings,
  aggregateSeasonStandings,
  awardEventPoints,
  scoreMatchResult,
} from "./scoring";

const config: ScoringConfig = {
  placementPoints: { 1: 12, 2: 9 },
  pointsPerKill: 1.5,
  bonusCategoryMultipliers: { featured: 2 },
  penaltyCategoryMultipliers: { conduct: 3 },
  defaultMultiplier: 1,
  minimumMatchPoints: 0,
};
const ties: readonly TiebreakRule[] = [
  { metric: "points", direction: "desc" },
  { metric: "wins", direction: "desc" },
  { metric: "kills", direction: "desc" },
  { metric: "bestPlacement", direction: "asc" },
  { metric: "teamId", direction: "asc" },
];

function result(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    matchId: "m1",
    tournamentId: "e1",
    sequence: 1,
    teamId: "a",
    placement: 1,
    kills: 4,
    ...overrides,
  };
}

describe("scoring", () => {
  it("applies category adjustments before the match multiplier", () => {
    const scored = scoreMatchResult(
      result({
        bonuses: [{ id: "b", category: "featured", points: 2, reason: "demo" }],
        penalties: [{ id: "p", category: "conduct", points: 1, reason: "demo" }],
        multiplier: 2,
      }),
      config,
    );
    expect(scored).toMatchObject({
      placementPoints: 12,
      killPoints: 6,
      bonusPoints: 4,
      penaltyPoints: 3,
      multiplier: 2,
      matchPoints: 38,
    });
  });

  it("floors negative totals and rejects invalid result values", () => {
    expect(
      scoreMatchResult(
        result({ penalties: [{ id: "p", category: "plain", points: 100, reason: "demo" }] }),
        config,
      ).matchPoints,
    ).toBe(0);
    expect(() => scoreMatchResult(result({ placement: 0 }), config)).toThrow("Placement");
    expect(() => scoreMatchResult(result({ kills: -1 }), config)).toThrow("Kills");
    expect(() => scoreMatchResult(result({ multiplier: -1 }), config)).toThrow("Multiplier");
  });

  it("uses ordered tiebreakers deterministically", () => {
    const standings = aggregateMatchStandings(
      [
        result({ teamId: "kills", placement: 2, kills: 3 }),
        result({ teamId: "winner", placement: 1, kills: 1 }),
      ],
      { ...config, pointsPerKill: 1 },
      ties,
    );
    expect(standings.map((standing) => standing.teamId)).toEqual(["winner", "kills"]);
    expect(standings.map((standing) => standing.rank)).toEqual([1, 2]);
  });

  it("keeps match, event, and season points separate", () => {
    const match = aggregateMatchStandings(
      [result({ teamId: "a" }), result({ teamId: "b", placement: 2, kills: 0 })],
      config,
      ties,
    );
    const event = awardEventPoints(match, { byRank: { 1: 10 }, defaultPoints: 4 });
    const season = aggregateSeasonStandings(
      [event],
      { byRank: { 1: 100 }, defaultPoints: 20 },
      ties,
    );
    expect(event[0]).toMatchObject({ matchPoints: 18, eventPoints: 10, seasonPoints: 0 });
    expect(season[0]).toMatchObject({ matchPoints: 18, eventPoints: 10, seasonPoints: 100 });
  });

  it("counts only each team's deterministic best max-match results", () => {
    const standings = aggregateMatchStandings(
      [
        result({ matchId: "m1", sequence: 1, placement: 1, kills: 0 }),
        result({ matchId: "m2", sequence: 2, placement: 2, kills: 4 }),
        result({ matchId: "m3", sequence: 3, placement: 20, kills: 0 }),
      ],
      config,
      ties,
      2,
    );
    expect(standings[0]).toMatchObject({ matchesPlayed: 2, kills: 4 });
    expect(() => aggregateMatchStandings([result()], config, ties, -1)).toThrow("maxMatches");
  });
});
