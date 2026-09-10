import { describe, expect, it } from "vitest";

import {
  isValidApexTag,
  normalizeApexRankName,
  normalizeApexTag,
  rankMeetsMinimum,
} from "@/lib/apex-rank";

describe("rank provider helpers", () => {
  it("normalizes apex tags", () => {
    expect(normalizeApexTag(" alcl ")).toBe("ALCL");
    expect(isValidApexTag("ALCL")).toBe(true);
    expect(isValidApexTag("AB")).toBe(false);
  });

  it("maps predator rank names", () => {
    expect(normalizeApexRankName("Apex Predator")).toBe("Predator");
    expect(normalizeApexRankName("Diamond")).toBe("Diamond");
  });

  it("checks minimum registration rank", () => {
    expect(rankMeetsMinimum("Platinum", "Platinum")).toBe(true);
    expect(rankMeetsMinimum("Gold", "Platinum")).toBe(false);
  });
});
