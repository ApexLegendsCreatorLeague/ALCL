import { describe, expect, it } from "vitest";
import {
  liveApiDraftResults,
  normalizeLiveApiEvent,
  reduceLiveApiEvents,
} from "./liveapi";

const receivedAt = "2026-09-06T08:00:00.000Z";

function event(
  sequence: number,
  typeName: string,
  message: Record<string, unknown>,
) {
  return normalizeLiveApiEvent({
    id: `event-${sequence}`,
    sequence,
    receivedAt,
    body: { typeName, message },
  });
}

describe("Apex LiveAPI normalization", () => {
  it("normalizes player stat messages without retaining account credentials", () => {
    const normalized = event(1, "PlayerStatChanged", {
      player: { name: "Aster", teamId: 4, teamName: "Northstar" },
      statName: "kills",
      newValue: 3,
    });

    expect(normalized).toMatchObject({
      kind: "player_stat",
      playerName: "Aster",
      teamKey: "4",
      teamName: "Northstar",
      metric: "kills",
      metricValue: 3,
    });
  });

  it("accepts payload and event envelope variants", () => {
    const normalized = normalizeLiveApiEvent({
      id: "event-2",
      sequence: 2,
      receivedAt,
      body: {
        eventType: "SquadEliminated",
        payload: { squadId: "8", squadName: "Emberline", placement: 3 },
      },
    });
    expect(normalized).toMatchObject({
      kind: "team_eliminated",
      teamKey: "8",
      placement: 3,
    });
  });
});

describe("Apex LiveAPI match reducer", () => {
  it("derives team kills, placements, winner, and additional player statistics", () => {
    const state = reduceLiveApiEvents(undefined, [
      event(1, "MatchSetup", { mapName: "World's Edge" }),
      event(2, "PlayerConnected", {
        player: { name: "Aster", teamId: 1, teamName: "Northstar" },
      }),
      event(3, "PlayerConnected", {
        player: { name: "Brim", teamId: 2, teamName: "Emberline" },
      }),
      event(4, "PlayerConnected", {
        player: { name: "Cipher", teamId: 3, teamName: "Violet Circuit" },
      }),
      event(5, "GameStateChanged", { state: "Playing" }),
      event(6, "PlayerStatChanged", {
        player: { name: "Aster", teamId: 1 },
        statName: "kills",
        newValue: 5,
      }),
      event(7, "PlayerStatChanged", {
        player: { name: "Aster", teamId: 1 },
        statName: "damageDealt",
        newValue: 1420,
      }),
      event(8, "SquadEliminated", { teamId: 2, placement: 3 }),
      event(9, "SquadEliminated", { teamId: 3, placement: 2 }),
      event(10, "GameStateChanged", { state: "Resolution" }),
    ]);

    expect(state.mapName).toBe("World's Edge");
    expect(state.status).toBe("resolution");
    expect(liveApiDraftResults(state)).toEqual([
      {
        teamKey: "1",
        placement: 1,
        kills: 5,
        assists: 0,
        damage: 1420,
        knocks: 0,
      },
      {
        teamKey: "3",
        placement: 2,
        kills: 0,
        assists: 0,
        damage: 0,
        knocks: 0,
      },
      {
        teamKey: "2",
        placement: 3,
        kills: 0,
        assists: 0,
        damage: 0,
        knocks: 0,
      },
    ]);
  });

  it("is idempotent for replayed event sequences", () => {
    const killTotal = event(2, "PlayerStatChanged", {
      player: { name: "Aster", teamId: 1 },
      statName: "kills",
      newValue: 2,
    });
    const initial = reduceLiveApiEvents(undefined, [
      event(1, "PlayerConnected", { player: { name: "Aster", teamId: 1 } }),
      killTotal,
    ]);
    expect(reduceLiveApiEvents(initial, [killTotal])).toEqual(initial);
  });
});
