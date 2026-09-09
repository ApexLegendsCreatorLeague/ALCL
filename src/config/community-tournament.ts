export const COMMUNITY_TOURNAMENT_MODE = true as const;
export const COMMERCIAL_AUTHORIZATION_ENABLED = false as const;

export const EA_INDEPENDENCE_DISCLAIMER =
  "This tournament is not affiliated with or sponsored by Electronic Arts Inc.";

export const POLICY_LAST_REVIEWED = "2026-09-05";

export const POLICY_SOURCES = [
  {
    label: "Apex Legends Community Tournament Guidelines",
    href: "https://www.ea.com/en-gb/games/apex-legends/community-tournament-guidelines",
  },
  {
    label: "EA User Agreement",
    href: "https://www.ea.com/legal/user-agreement",
  },
  {
    label: "EA Positive Play Charter",
    href: "https://www.ea.com/commitments/positive-play/charter",
  },
  {
    label: "EA Content Policy",
    href: "https://help.ea.com/en/articles/security-and-rules/ea-content-policy/",
  },
] as const;

export const COMMUNITY_LIMITS = {
  cashPrizeUsd: 0,
  annualPrizeCashValueUsd: 10_000,
  maximumRosterPlayers: 5,
  activeMatchPlayersPerTeam: 3,
  maximumPrivateMatchPlayers: 60,
  maximumPrivateMatchObservers: 5,
} as const;

export const BLOCKED_TERRITORIES = [
  {
    code: "TR",
    names: ["Türkiye", "Turkey", "Republic of Türkiye"],
    message:
      "ALCL community tournaments cannot currently be operated in this territory under the applicable tournament guidelines.",
  },
] as const;

export const PROHIBITED_SUPPORTER_CATEGORIES = [
  "adult-content",
  "contraceptives",
  "online-dating",
  "alcohol",
  "tobacco",
  "restricted-drugs",
  "drug-paraphernalia",
  "firearms",
  "weapons",
  "explosives",
  "tattoos-body-branding",
  "gambling",
  "sports-betting",
  "daily-fantasy",
  "lottery",
  "political-promotion",
  "illegal-services",
  "obscene-misleading-discriminatory-content",
  "pharmaceuticals",
  "dietary-supplements",
  "medical-devices",
  "energy-drinks",
  "cryptocurrency",
  "competing-games",
  "competing-esports-events",
  "account-selling",
  "coin-gold-services",
  "hacking-services",
  "rating-inconsistent-products",
] as const;

export type ProhibitedSupporterCategory =
  (typeof PROHIBITED_SUPPORTER_CATEGORIES)[number];

export const COMMUNITY_MODE_MESSAGES = {
  monetaryPrize:
    "Monetary prizes are disabled for the ALCL community-tournament configuration. Additional authorization may be required for a different tournament structure.",
  commercialFeature:
    "Commercial tournament features require separate written authorization and legal review.",
  officialAsset:
    "Official EA, Respawn, ALGS, or Apex Legends logos and artwork cannot be uploaded for ALCL branding.",
  unpublishedRules:
    "Publish the event-specific rules before opening registration or beginning play.",
  broadcast:
    "ALCL community tournament broadcasts must use public streaming platforms; TV and paid-access distribution are disabled.",
} as const;

export function isBlockedTerritory(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase("en-US");
  return BLOCKED_TERRITORIES.some(
    ({ code, names }) =>
      code.toLocaleLowerCase("en-US") === normalized ||
      names.some((name) => name.toLocaleLowerCase("en-US") === normalized),
  );
}

export function isProhibitedSupporterCategory(
  value: string,
): value is ProhibitedSupporterCategory {
  return (PROHIBITED_SUPPORTER_CATEGORIES as readonly string[]).includes(value);
}

export function assertCommunityTournamentConfiguration(input: {
  cashPrizeUsd: number;
  territory: string;
  rulesPublished: boolean;
  distribution: "public-stream" | "tv" | "paid-digital" | "other";
}): string[] {
  const errors: string[] = [];
  if (COMMUNITY_TOURNAMENT_MODE && input.cashPrizeUsd > 0) {
    errors.push(COMMUNITY_MODE_MESSAGES.monetaryPrize);
  }
  if (isBlockedTerritory(input.territory)) {
    errors.push(BLOCKED_TERRITORIES[0].message);
  }
  if (!input.rulesPublished) {
    errors.push(COMMUNITY_MODE_MESSAGES.unpublishedRules);
  }
  if (input.distribution !== "public-stream") {
    errors.push(COMMUNITY_MODE_MESSAGES.broadcast);
  }
  return errors;
}

// Compatibility aliases used by domain modules.
export const EA_POLICY_REVIEWED_AT = POLICY_LAST_REVIEWED;
export const EA_DISCLAIMER = EA_INDEPENDENCE_DISCLAIMER;
export const MONETARY_PRIZE_DISABLED_MESSAGE =
  COMMUNITY_MODE_MESSAGES.monetaryPrize;
export const TURKEY_DISABLED_MESSAGE = BLOCKED_TERRITORIES[0].message;
export const POLICY_LINKS = POLICY_SOURCES;
export const isTurkeyTerritory = isBlockedTerritory;

export function assertCommunityConfiguration(input: {
  cashPrizeUsd?: number;
  territory?: string;
  supporterCategory?: string;
}) {
  if ((input.cashPrizeUsd ?? 0) > 0) {
    throw new Error(MONETARY_PRIZE_DISABLED_MESSAGE);
  }
  if (input.territory && isTurkeyTerritory(input.territory)) {
    throw new Error(TURKEY_DISABLED_MESSAGE);
  }
  if (
    input.supporterCategory &&
    isProhibitedSupporterCategory(input.supporterCategory)
  ) {
    throw new Error("This supporter category is prohibited by ALCL policy.");
  }
}
