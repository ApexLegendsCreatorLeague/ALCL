export type Id = string;
export type ISODateTime = string;

export const RANKS = [
  "Rookie",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Master",
  "Predator",
] as const;
export type Rank = (typeof RANKS)[number];

export interface RankSnapshot {
  readonly rank: Rank;
  readonly capturedAt: ISODateTime;
  readonly source: "manual" | "external";
}

export interface Player {
  readonly id: Id;
  readonly displayName: string;
  readonly countryCode: string;
  readonly rankHistory: readonly RankSnapshot[];
}

export interface RosterMembership {
  readonly playerId: Id;
  readonly joinedAt: ISODateTime;
  readonly leftAt?: ISODateTime;
}

export interface Team {
  readonly id: Id;
  readonly name: string;
  readonly shortName: string;
  readonly roster: readonly RosterMembership[];
}

export interface League {
  readonly id: Id;
  readonly name: string;
  readonly territory: string;
}

export interface Season {
  readonly id: Id;
  readonly leagueId: Id;
  readonly name: string;
  readonly startsAt: ISODateTime;
  readonly endsAt: ISODateTime;
  readonly tournamentIds: readonly Id[];
}

export interface Tournament {
  readonly id: Id;
  readonly seasonId: Id;
  readonly name: string;
  readonly startsAt: ISODateTime;
  readonly rosterLockAt: ISODateTime;
  readonly status: "scheduled" | "active" | "complete";
  readonly rulesPublishedAt: ISODateTime;
}

export interface MatchLineup {
  readonly teamId: Id;
  readonly playerIds: readonly Id[];
}

export interface ScoreAdjustment {
  readonly id: Id;
  readonly category: string;
  readonly points: number;
  readonly reason: string;
}

export interface MatchResult {
  readonly matchId: Id;
  readonly tournamentId: Id;
  readonly sequence: number;
  readonly teamId: Id;
  readonly placement: number;
  readonly kills: number;
  readonly bonuses?: readonly ScoreAdjustment[];
  readonly penalties?: readonly ScoreAdjustment[];
  readonly multiplier?: number;
}

export interface Match {
  readonly id: Id;
  readonly tournamentId: Id;
  readonly sequence: number;
  readonly playedAt: ISODateTime;
  readonly observerCount: number;
  readonly lineups: readonly MatchLineup[];
  readonly results: readonly MatchResult[];
}

export interface ScoringConfig {
  readonly placementPoints: Readonly<Record<number, number>>;
  readonly pointsPerKill: number;
  readonly bonusCategoryMultipliers?: Readonly<Record<string, number>>;
  readonly penaltyCategoryMultipliers?: Readonly<Record<string, number>>;
  readonly defaultMultiplier: number;
  readonly minimumMatchPoints?: number;
}

export interface ScoreBreakdown {
  readonly teamId: Id;
  readonly matchId: Id;
  readonly placementPoints: number;
  readonly killPoints: number;
  readonly bonusPoints: number;
  readonly penaltyPoints: number;
  readonly multiplier: number;
  readonly matchPoints: number;
}

export type TiebreakMetric =
  | "points"
  | "wins"
  | "kills"
  | "bestPlacement"
  | "lastMatchPoints"
  | "teamId";

export interface TiebreakRule {
  readonly metric: TiebreakMetric;
  readonly direction: "asc" | "desc";
}

export interface Standing {
  readonly rank: number;
  readonly teamId: Id;
  readonly matchPoints: number;
  readonly eventPoints: number;
  readonly seasonPoints: number;
  readonly kills: number;
  readonly wins: number;
  readonly bestPlacement: number;
  readonly matchesPlayed: number;
  readonly lastMatchPoints: number;
}

export interface PointsAwardConfig {
  readonly byRank: Readonly<Record<number, number>>;
  readonly defaultPoints: number;
}

export interface QualificationRule {
  readonly id: Id;
  readonly name: string;
  readonly source: "event" | "season";
  readonly topN: number;
  readonly minimumPoints?: number;
  readonly excludeTeamIds?: readonly Id[];
}

export interface Qualification {
  readonly ruleId: Id;
  readonly teamId: Id;
  readonly sourceRank: number;
  readonly qualifiedAt: ISODateTime;
}

export interface RosterEligibilityConfig {
  readonly rosterLockAt: ISODateTime;
  readonly minimumRosterSize: number;
  readonly maximumRosterSize: 5;
  readonly lineupSize: 3;
  readonly maximumPredators: number;
}

export interface EligibilityIssue {
  readonly code:
    | "ROSTER_TOO_SMALL"
    | "ROSTER_TOO_LARGE"
    | "LINEUP_SIZE"
    | "PLAYER_NOT_ON_ROSTER"
    | "MISSING_RANK_SNAPSHOT"
    | "TOO_MANY_PREDATORS"
    | "DUPLICATE_PLAYER"
    | "ACTIVE_PLAYER_LIMIT"
    | "OBSERVER_LIMIT";
  readonly message: string;
  readonly teamId?: Id;
  readonly playerId?: Id;
}

export type SupporterCategory =
  | "technology"
  | "apparel"
  | "food"
  | "education"
  | "community"
  | "adult-content"
  | "alcohol"
  | "tobacco"
  | "gambling"
  | "cryptocurrency"
  | "energy-drinks"
  | "competing-games"
  | "account-selling"
  | "hacking-services";

export interface Supporter {
  readonly id: Id;
  readonly name: string;
  readonly category: SupporterCategory;
  readonly annualNonCashValueUsd: number;
}

export interface ComplianceInput {
  readonly cashPrizeUsd: number;
  readonly annualPrizeCashValueUsd: number;
  readonly territory: string;
  readonly supporterCategories: readonly SupporterCategory[];
  readonly rulesPublishedAt?: ISODateTime;
  readonly registrationOpensAt: ISODateTime;
  readonly usesOfficialBroadcastAssets: boolean;
  readonly broadcastHasRequiredDisclaimer: boolean;
}

export interface ComplianceViolation {
  readonly code:
    | "CASH_PRIZE"
    | "ANNUAL_VALUE_LIMIT"
    | "TURKEY"
    | "PROHIBITED_SUPPORTER"
    | "RULES_NOT_PUBLISHED"
    | "RULES_PUBLISHED_LATE"
    | "OFFICIAL_BROADCAST_ASSETS"
    | "MISSING_BROADCAST_DISCLAIMER";
  readonly message: string;
}

export interface HistoricalSnapshot<T> {
  readonly id: Id;
  readonly entityType: string;
  readonly entityId: Id;
  readonly capturedAt: ISODateTime;
  readonly data: Readonly<T>;
  readonly checksum: string;
}

export interface ExternalResultRecord {
  readonly externalId: string;
  readonly teamReference: string;
  readonly placement: number;
  readonly kills: number;
  readonly bonus?: number;
  readonly penalty?: number;
}

export interface ManualIngestionBatch {
  readonly id: Id;
  readonly sourceName: string;
  readonly importedAt: ISODateTime;
  readonly tournamentId: Id;
  readonly matchId: Id;
  readonly sequence: number;
  readonly records: readonly ExternalResultRecord[];
}

export interface IngestionIssue {
  readonly recordIndex?: number;
  readonly code: "EMPTY_BATCH" | "UNKNOWN_TEAM" | "DUPLICATE_TEAM" | "INVALID_PLACEMENT" | "INVALID_KILLS";
  readonly message: string;
}

export interface IngestionResult {
  readonly accepted: boolean;
  readonly results: readonly MatchResult[];
  readonly issues: readonly IngestionIssue[];
}
