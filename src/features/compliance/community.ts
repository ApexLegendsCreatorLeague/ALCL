export const PROHIBITED_SUPPORTER_CATEGORIES = [
  "adult-content",
  "contraceptives",
  "online-dating",
  "alcohol",
  "tobacco",
  "vaping",
  "cannabis",
  "restricted-drugs",
  "controlled-substances",
  "drug-paraphernalia",
  "weapons",
  "firearms",
  "ammunition",
  "explosives",
  "tattoos-body-branding",
  "gambling",
  "betting",
  "sports-betting",
  "daily-fantasy",
  "lottery",
  "cryptocurrency",
  "nft",
  "pornography",
  "political",
  "political-promotion",
  "religious",
  "hate-group",
  "pharmaceutical",
  "pharmaceuticals",
  "dietary-supplements",
  "medical-devices",
  "unlicensed-financial-services",
  "illegal-services",
  "obscene-misleading-discriminatory-content",
  "energy-drinks",
  "ea-competitor",
  "competing-games",
  "competing-esports-events",
  "account-selling",
  "coin-gold-services",
  "hacking-services",
  "rating-inconsistent-products",
] as const;

export type DistributionMode = "free-streaming" | "paid-streaming" | "television";

export interface CommunitySupporter {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly annualNonCashValue: number;
}

export interface CommunityCompetition {
  cashPrize: number;
  annualNonCashPrizeValue: number;
  hostCountryCode: string;
  supporters: readonly CommunitySupporter[];
  distribution: DistributionMode;
  rulesPublished: boolean;
  activePlayers: number;
  observers: number;
}

export interface ComplianceResult {
  compliant: boolean;
  violations: readonly string[];
}

export function validateCommunityCompetition(
  competition: CommunityCompetition,
): ComplianceResult {
  const violations: string[] = [];
  if (competition.cashPrize !== 0) violations.push("Cash prizes are not permitted");
  if (competition.annualNonCashPrizeValue > 10_000) {
    violations.push("Annual non-cash prize value exceeds 10,000");
  }
  if (competition.annualNonCashPrizeValue < 0) {
    violations.push("Annual non-cash prize value cannot be negative");
  }
  if (competition.hostCountryCode.trim().toUpperCase() === "TR") {
    violations.push("Competitions hosted in Turkey are not permitted");
  }

  const prohibited = new Set<string>(PROHIBITED_SUPPORTER_CATEGORIES);
  for (const supporter of competition.supporters) {
    const category = supporter.category.trim().toLowerCase();
    if (prohibited.has(category)) {
      violations.push(`Supporter category is prohibited: ${category}`);
    }
  }
  if (competition.distribution !== "free-streaming") {
    violations.push("Distribution must be free streaming only; paid streams and television are prohibited");
  }
  if (!competition.rulesPublished) violations.push("Rules must be published before registration");
  if (!Number.isInteger(competition.activePlayers) || competition.activePlayers < 0) {
    violations.push("Active player count must be a non-negative integer");
  } else if (competition.activePlayers > 60) {
    violations.push("Active player count exceeds 60");
  }
  if (!Number.isInteger(competition.observers) || competition.observers < 0) {
    violations.push("Observer count must be a non-negative integer");
  } else if (competition.observers > 5) {
    violations.push("Observer count exceeds 5");
  }
  return { compliant: violations.length === 0, violations };
}
