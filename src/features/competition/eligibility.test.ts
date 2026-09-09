import { describe, expect, it } from "vitest";
import type { Match, Player, RosterEligibilityConfig, Team } from "@/types/domain";
import {
  rankAt,
  validateLineup,
  validateMatchCapacity,
  validateRosterEligibility,
} from "./eligibility";

const lock = "2026-02-01T00:00:00.000Z";
const eligibility: RosterEligibilityConfig = {
  rosterLockAt: lock,
  minimumRosterSize: 3,
  maximumRosterSize: 5,
  lineupSize: 3,
  maximumPredators: 1,
};
const player = (id: string, rank: "Predator" | "Diamond" = "Diamond"): Player => ({
  id,
  displayName: id,
  countryCode: "US",
  rankHistory: [{ rank, capturedAt: "2026-01-01T00:00:00.000Z", source: "manual" }],
});
const team = (ids: readonly string[]): Team => ({
  id: "team",
  name: "Fictional Team",
  shortName: "FT",
  roster: ids.map((playerId) => ({ playerId, joinedAt: "2026-01-01T00:00:00.000Z" })),
});

describe("roster and lobby eligibility", () => {
  it("selects the latest rank snapshot at roster lock", () => {
    const changing: Player = {
      ...player("p1"),
      rankHistory: [
        { rank: "Diamond", capturedAt: "2026-01-01T00:00:00.000Z", source: "manual" },
        { rank: "Predator", capturedAt: "2026-03-01T00:00:00.000Z", source: "external" },
      ],
    };
    expect(rankAt(changing, lock)?.rank).toBe("Diamond");
  });

  it("enforces five roster members and configurable one-Predator maximum", () => {
    const ids = ["p1", "p2", "p3", "p4", "p5", "p6"];
    const players = new Map(ids.map((id, index) => [id, player(id, index < 2 ? "Predator" : "Diamond")]));
    expect(validateRosterEligibility(team(ids), players, eligibility).map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["ROSTER_TOO_LARGE", "TOO_MANY_PREDATORS"]),
    );
  });

  it("requires exactly three unique locked-roster players", () => {
    const issues = validateLineup(
      { teamId: "team", playerIds: ["p1", "p1", "outside"] },
      team(["p1", "p2", "p3"]),
      eligibility,
    );
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["DUPLICATE_PLAYER", "PLAYER_NOT_ON_ROSTER"]),
    );
    expect(validateLineup({ teamId: "team", playerIds: ["p1", "p2"] }, team(["p1", "p2", "p3"]), eligibility)[0].code)
      .toBe("LINEUP_SIZE");
  });

  it("allows 60 active players and 5 observers but rejects one over", () => {
    const base: Match = {
      id: "m",
      tournamentId: "t",
      sequence: 1,
      playedAt: lock,
      observerCount: 5,
      lineups: Array.from({ length: 20 }, (_, index) => ({
        teamId: `t${index}`,
        playerIds: [`${index}a`, `${index}b`, `${index}c`],
      })),
      results: [],
    };
    expect(validateMatchCapacity(base)).toEqual([]);
    expect(validateMatchCapacity({ ...base, observerCount: 6 })[0].code).toBe("OBSERVER_LIMIT");
    expect(
      validateMatchCapacity({
        ...base,
        lineups: [...base.lineups, { teamId: "extra", playerIds: ["a"] }],
      })[0].code,
    ).toBe("ACTIVE_PLAYER_LIMIT");
  });
});
