import { describe, expect, it } from "vitest";
import { containsReservedAffiliationClaim } from "./brand";

describe("brand guard", () => {
  it("does not flag ordinary words containing ea", () => {
    expect(containsReservedAffiliationClaim("Creator League")).toBe(false);
  });

  it("flags reserved affiliation terms", () => {
    expect(containsReservedAffiliationClaim("Official EA Partner")).toBe(true);
    expect(containsReservedAffiliationClaim("ALGS approved")).toBe(true);
  });
});
