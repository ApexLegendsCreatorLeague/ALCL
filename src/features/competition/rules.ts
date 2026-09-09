import type {
  ComplianceInput,
  ComplianceViolation,
  Qualification,
  QualificationRule,
  Standing,
  SupporterCategory,
} from "@/types/domain";

export const PROHIBITED_SUPPORTER_CATEGORIES = new Set<SupporterCategory>([
  "adult-content",
  "alcohol",
  "tobacco",
  "gambling",
  "cryptocurrency",
  "energy-drinks",
  "competing-games",
  "account-selling",
  "hacking-services",
]);

export function determineQualifications(
  standings: readonly Standing[],
  rule: QualificationRule,
  qualifiedAt: string,
): readonly Qualification[] {
  if (!Number.isInteger(rule.topN) || rule.topN < 0) {
    throw new Error("Qualification topN must be a non-negative integer.");
  }
  const excluded = new Set(rule.excludeTeamIds ?? []);
  return [...standings]
    .sort((a, b) => a.rank - b.rank || a.teamId.localeCompare(b.teamId))
    .filter((standing) => {
      const points = rule.source === "event" ? standing.eventPoints : standing.seasonPoints;
      return !excluded.has(standing.teamId) && points >= (rule.minimumPoints ?? 0);
    })
    .slice(0, rule.topN)
    .map((standing) => ({
      ruleId: rule.id,
      teamId: standing.teamId,
      sourceRank: standing.rank,
      qualifiedAt,
    }));
}

const turkeyNames = new Set(["tr", "turkey", "türkiye", "turkiye"]);

export function validateCommunityCompliance(
  input: ComplianceInput,
): readonly ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];
  if (input.cashPrizeUsd > 0) {
    violations.push({ code: "CASH_PRIZE", message: "Cash prizes are disabled for this community configuration." });
  }
  if (input.annualPrizeCashValueUsd > 10_000) {
    violations.push({ code: "ANNUAL_VALUE_LIMIT", message: "Annual prize cash value cannot exceed USD 10,000." });
  }
  if (turkeyNames.has(input.territory.trim().toLocaleLowerCase("en-US"))) {
    violations.push({ code: "TURKEY", message: "Community tournaments cannot operate in Türkiye." });
  }
  for (const category of new Set(input.supporterCategories)) {
    if (PROHIBITED_SUPPORTER_CATEGORIES.has(category)) {
      violations.push({ code: "PROHIBITED_SUPPORTER", message: `Supporter category '${category}' is prohibited.` });
    }
  }
  if (!input.rulesPublishedAt) {
    violations.push({ code: "RULES_NOT_PUBLISHED", message: "Rules must be published before registration opens." });
  } else if (Date.parse(input.rulesPublishedAt) > Date.parse(input.registrationOpensAt)) {
    violations.push({ code: "RULES_PUBLISHED_LATE", message: "Rules were published after registration opened." });
  }
  if (input.usesOfficialBroadcastAssets) {
    violations.push({ code: "OFFICIAL_BROADCAST_ASSETS", message: "Official broadcast artwork and assets may not be used." });
  }
  if (!input.broadcastHasRequiredDisclaimer) {
    violations.push({ code: "MISSING_BROADCAST_DISCLAIMER", message: "Broadcast must display the required non-affiliation disclaimer." });
  }
  return violations;
}

export function assertCommunityCompliance(input: ComplianceInput): void {
  const violations = validateCommunityCompliance(input);
  if (violations.length) {
    throw new Error(violations.map((violation) => `${violation.code}: ${violation.message}`).join("\n"));
  }
}
