export const RANK_ORDER = [
  "Rookie",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Master",
  "Predator",
] as const;

export type CompetitionRank = (typeof RANK_ORDER)[number];

export function normalizeApexTag(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

export function isValidApexTag(value: string) {
  const normalized = normalizeApexTag(value);
  return normalized.length >= 3 && normalized.length <= 4;
}

export function dbPlatformToApiPlatform(platform: string | null) {
  switch (platform) {
    case "playstation":
      return "PS4";
    case "xbox":
      return "X1";
    case "switch":
      return "SWITCH";
    case "pc":
    default:
      return "PC";
  }
}

export function normalizeApexRankName(value: string | null | undefined): CompetitionRank | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (/predator/i.test(cleaned)) return "Predator";
  const match = RANK_ORDER.find((rank) => rank.toLowerCase() === cleaned.toLowerCase());
  return match ?? null;
}

export function rankMeetsMinimum(rank: CompetitionRank, minimum: CompetitionRank) {
  return RANK_ORDER.indexOf(rank) >= RANK_ORDER.indexOf(minimum);
}
