import { describe, expect, it } from "vitest";

import {
  normalizePlayerName,
  resolvePlayerIdForTeam,
  type TeamPlayerNameMap,
} from "./liveapi-player-match";

describe("LiveAPI player name matching", () => {
  it("normalizes names for case-insensitive comparison", () => {
    expect(normalizePlayerName("  KushyKush ")).toBe("kushykush");
  });

  it("resolves player ids within the bound team roster", () => {
    const maps: TeamPlayerNameMap = new Map([
      [
        "team-a",
        new Map([
          ["aster", "player-1"],
          ["north", "player-2"],
        ]),
      ],
    ]);

    expect(resolvePlayerIdForTeam(maps, "team-a", "Aster")).toBe("player-1");
    expect(resolvePlayerIdForTeam(maps, "team-a", "Unknown")).toBeNull();
    expect(resolvePlayerIdForTeam(maps, "team-b", "Aster")).toBeNull();
  });
});
