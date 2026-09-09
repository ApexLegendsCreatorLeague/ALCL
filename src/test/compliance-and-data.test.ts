import { describe, expect, it } from "vitest";
import {
  PROHIBITED_SUPPORTER_CATEGORIES,
  validateCommunityCompetition,
  type CommunityCompetition,
} from "@/features/compliance/community";
import { createAdapter, DisabledDataAdapter, ManualDataAdapter } from "@/features/data/adapter";
import { demoData } from "@/lib/demo-data";

const compliant: CommunityCompetition = {
  cashPrize: 0,
  annualNonCashPrizeValue: 10_000,
  hostCountryCode: "US",
  supporters: [{
    id: "supporter",
    name: "Fictional Hardware",
    category: "computer-hardware",
    annualNonCashValue: 1000,
  }],
  distribution: "free-streaming",
  rulesPublished: true,
  activePlayers: 60,
  observers: 5,
};

describe("community compliance", () => {
  it("accepts every allowed boundary", () => {
    expect(validateCommunityCompetition(compliant)).toEqual({ compliant: true, violations: [] });
  });

  it("reports all simultaneous competition violations", () => {
    const output = validateCommunityCompetition({
      ...compliant,
      cashPrize: 1,
      annualNonCashPrizeValue: 10_001,
      hostCountryCode: "tr",
      distribution: "television",
      rulesPublished: false,
      activePlayers: 61,
      observers: 6,
      supporters: [{
        id: "bad",
        name: "Bad Supporter",
        category: "GAMBLING",
        annualNonCashValue: 0,
      }],
    });
    expect(output.compliant).toBe(false);
    expect(output.violations).toHaveLength(8);
  });

  it.each(PROHIBITED_SUPPORTER_CATEGORIES)("strictly blocks supporter category %s", (category) => {
    const output = validateCommunityCompetition({
      ...compliant,
      supporters: [{ id: "s", name: "Blocked", category, annualNonCashValue: 0 }],
    });
    expect(output.compliant).toBe(false);
  });
});

describe("external data adapters", () => {
  it("enables a generic manual adapter and returns a defensive clone", async () => {
    const source = [{ value: 1 }];
    const adapter = new ManualDataAdapter<{ value: number }>();
    const imported = await adapter.import(source);
    expect(adapter.enabled).toBe(true);
    expect(imported).toEqual(source);
    expect(imported).not.toBe(source);
  });

  it("keeps every non-manual external provider disabled", async () => {
    const adapter = createAdapter("score-feed");
    expect(adapter).toBeInstanceOf(DisabledDataAdapter);
    expect(adapter.enabled).toBe(false);
    await expect(adapter.import({})).rejects.toThrow("disabled");
  });
});

describe("reusable demo data", () => {
  it("contains a complete fictional season dataset", () => {
    expect(demoData.tournaments).toHaveLength(5);
    expect(demoData.teams).toHaveLength(20);
    expect(demoData.players.length).toBeGreaterThanOrEqual(64);
    expect(demoData.matches.length).toBeGreaterThan(0);
    expect(demoData.eventStandings).toHaveLength(5);
    expect(demoData.seasonStandings).toHaveLength(20);
    expect(demoData.supporters.length).toBeGreaterThan(0);
    expect(demoData.hallOfFame.length).toBeGreaterThan(0);
    expect(demoData.notifications.length).toBeGreaterThan(0);
    expect(demoData.profiles.length).toBeGreaterThanOrEqual(64);
  });

  it("provides five-player rosters and exactly-three lineups", () => {
    expect(demoData.teams.every((team) => team.roster.length === 5)).toBe(true);
    expect(demoData.matches.every((match) =>
      match.lineups.every((lineup) => lineup.playerIds.length === 3))).toBe(true);
  });
});
