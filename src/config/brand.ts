export const BRAND = {
  name: "ALCL",
  descriptor: "Independent community tournaments for Apex Legends",
  tagline: "Where communities compete.",
  organizationStatement:
    "ALCL is an independent community tournament organization.",
  defaultTitle: "ALCL — Community Tournament Platform",
  defaultDescription:
    "Follow independent community tournaments, teams, players, results, and season standings.",
} as const;

export const RESERVED_BRAND_TERMS = [
  "Electronic Arts",
  "EA",
  "Respawn Entertainment",
  "ALGS",
] as const;

/**
 * This lightweight check supports form feedback only. It does not determine
 * trademark ownership or replace organizer review of an uploaded asset.
 */
export function containsReservedAffiliationClaim(value: string): boolean {
  const normalized = value.toLocaleLowerCase("en-US");
  return RESERVED_BRAND_TERMS.some((term) => {
    if (term === "EA") {
      return /\bea\b/i.test(value);
    }
    return normalized.includes(term.toLocaleLowerCase("en-US"));
  });
}
