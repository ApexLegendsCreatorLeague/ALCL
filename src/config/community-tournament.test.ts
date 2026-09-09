import { describe, expect, it } from "vitest";
import {
  assertCommunityTournamentConfiguration,
  isBlockedTerritory,
  isProhibitedSupporterCategory,
} from "./community-tournament";

describe("community tournament configuration", () => {
  it("blocks both Türkiye spellings", () => {
    expect(isBlockedTerritory("Türkiye")).toBe(true);
    expect(isBlockedTerritory("Turkey")).toBe(true);
    expect(isBlockedTerritory("Canada")).toBe(false);
  });

  it("recognizes prohibited supporter categories", () => {
    expect(isProhibitedSupporterCategory("gambling")).toBe(true);
    expect(isProhibitedSupporterCategory("cryptocurrency")).toBe(true);
    expect(isProhibitedSupporterCategory("community-nonprofit")).toBe(false);
  });

  it("rejects prohibited event settings", () => {
    const errors = assertCommunityTournamentConfiguration({
      cashPrizeUsd: 100,
      territory: "TR",
      rulesPublished: false,
      distribution: "paid-digital",
    });

    expect(errors).toHaveLength(4);
  });

  it("accepts the strict community defaults", () => {
    expect(
      assertCommunityTournamentConfiguration({
        cashPrizeUsd: 0,
        territory: "US",
        rulesPublished: true,
        distribution: "public-stream",
      }),
    ).toEqual([]);
  });
});
