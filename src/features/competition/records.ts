import type {
  ExternalResultRecord,
  HistoricalSnapshot,
  IngestionIssue,
  IngestionResult,
  ManualIngestionBatch,
  MatchResult,
} from "@/types/domain";

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(",")}}`;
}

function checksum(value: unknown): string {
  const text = stableSerialize(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

export function createHistoricalSnapshot<T>(
  entityType: string,
  entityId: string,
  capturedAt: string,
  data: T,
): HistoricalSnapshot<T> {
  const cloned = structuredClone(data);
  return deepFreeze({
    id: `${entityType}:${entityId}:${capturedAt}`,
    entityType,
    entityId,
    capturedAt,
    data: cloned,
    checksum: checksum(cloned),
  });
}

export interface ManualResultIngestor {
  ingest(
    batch: ManualIngestionBatch,
    teamReferenceMap: ReadonlyMap<string, string>,
  ): IngestionResult;
}

function validateRecord(
  record: ExternalResultRecord,
  index: number,
  knownTeams: ReadonlyMap<string, string>,
): readonly IngestionIssue[] {
  const issues: IngestionIssue[] = [];
  if (!knownTeams.has(record.teamReference)) {
    issues.push({ recordIndex: index, code: "UNKNOWN_TEAM", message: `Unknown team reference '${record.teamReference}'.` });
  }
  if (!Number.isInteger(record.placement) || record.placement < 1) {
    issues.push({ recordIndex: index, code: "INVALID_PLACEMENT", message: "Placement must be a positive integer." });
  }
  if (!Number.isInteger(record.kills) || record.kills < 0) {
    issues.push({ recordIndex: index, code: "INVALID_KILLS", message: "Kills must be a non-negative integer." });
  }
  return issues;
}

export const manualResultIngestor: ManualResultIngestor = {
  ingest(batch, teamReferenceMap) {
    const issues: IngestionIssue[] = [];
    if (!batch.records.length) {
      issues.push({ code: "EMPTY_BATCH", message: "Ingestion batch has no records." });
    }
    const seen = new Set<string>();
    batch.records.forEach((record, index) => {
      issues.push(...validateRecord(record, index, teamReferenceMap));
      if (seen.has(record.teamReference)) {
        issues.push({ recordIndex: index, code: "DUPLICATE_TEAM", message: "A team may appear only once per match batch." });
      }
      seen.add(record.teamReference);
    });
    if (issues.length) return { accepted: false, results: [], issues };

    const results: MatchResult[] = batch.records.map((record) => ({
      matchId: batch.matchId,
      tournamentId: batch.tournamentId,
      sequence: batch.sequence,
      teamId: teamReferenceMap.get(record.teamReference)!,
      placement: record.placement,
      kills: record.kills,
      bonuses:
        record.bonus === undefined
          ? []
          : [{ id: `${record.externalId}:bonus`, category: "external", points: record.bonus, reason: "Manual external import" }],
      penalties:
        record.penalty === undefined
          ? []
          : [{ id: `${record.externalId}:penalty`, category: "external", points: record.penalty, reason: "Manual external import" }],
    }));
    return { accepted: true, results, issues: [] };
  },
};
