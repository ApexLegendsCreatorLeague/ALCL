import { describe, expect, it } from "vitest";
import { demoData } from "@/lib/demo-data";
import type { ComplianceInput, ManualIngestionBatch, Standing } from "@/types/domain";
import { createHistoricalSnapshot, manualResultIngestor } from "./records";
import { determineQualifications, validateCommunityCompliance } from "./rules";

const compliant: ComplianceInput = {
  cashPrizeUsd: 0,
  annualPrizeCashValueUsd: 10_000,
  territory: "Canada",
  supporterCategories: ["technology"],
  rulesPublishedAt: "2026-01-01T00:00:00.000Z",
  registrationOpensAt: "2026-01-02T00:00:00.000Z",
  usesOfficialBroadcastAssets: false,
  broadcastHasRequiredDisclaimer: true,
};

describe("qualification and compliance", () => {
  it("qualifies top eligible teams in source-rank order", () => {
    const standing = (teamId: string, rank: number, points: number): Standing => ({
      teamId, rank, matchPoints: points, eventPoints: points, seasonPoints: points,
      kills: 0, wins: 0, bestPlacement: 20, matchesPlayed: 1, lastMatchPoints: points,
    });
    const qualifications = determineQualifications(
      [standing("a", 1, 20), standing("b", 2, 19), standing("c", 3, 18)],
      { id: "q", name: "Top two", source: "season", topN: 2, minimumPoints: 1, excludeTeamIds: ["a"] },
      "2026-01-03T00:00:00.000Z",
    );
    expect(qualifications.map((qualification) => qualification.teamId)).toEqual(["b", "c"]);
  });

  it("accepts boundary values and reports every critical policy violation", () => {
    expect(validateCommunityCompliance(compliant)).toEqual([]);
    const codes = validateCommunityCompliance({
      ...compliant,
      cashPrizeUsd: 1,
      annualPrizeCashValueUsd: 10_001,
      territory: "Türkiye",
      supporterCategories: ["gambling", "technology"],
      rulesPublishedAt: "2026-02-01T00:00:00.000Z",
      usesOfficialBroadcastAssets: true,
      broadcastHasRequiredDisclaimer: false,
    }).map((violation) => violation.code);
    expect(codes).toEqual(expect.arrayContaining([
      "CASH_PRIZE", "ANNUAL_VALUE_LIMIT", "TURKEY",
      "PROHIBITED_SUPPORTER", "RULES_PUBLISHED_LATE",
      "OFFICIAL_BROADCAST_ASSETS", "MISSING_BROADCAST_DISCLAIMER",
    ]));
    expect(validateCommunityCompliance({ ...compliant, rulesPublishedAt: undefined })[0].code)
      .toBe("RULES_NOT_PUBLISHED");
  });
});

describe("historical records and manual ingestion", () => {
  it("creates detached, frozen deterministic snapshots", () => {
    const source = { rows: [{ points: 10 }] };
    const first = createHistoricalSnapshot("standing", "s1", "2026-01-01T00:00:00.000Z", source);
    const second = createHistoricalSnapshot("standing", "s1", "2026-01-01T00:00:00.000Z", source);
    source.rows[0].points = 99;
    expect(first.data.rows[0].points).toBe(10);
    expect(first.checksum).toBe(second.checksum);
    expect(Object.isFrozen(first.data.rows)).toBe(true);
  });

  it("normalizes valid records and atomically rejects invalid batches", () => {
    const batch: ManualIngestionBatch = {
      id: "batch",
      sourceName: "Manual CSV",
      importedAt: "2026-01-01T00:00:00.000Z",
      tournamentId: "event",
      matchId: "match",
      sequence: 1,
      records: [{ externalId: "row-1", teamReference: "AAA", placement: 1, kills: 5, bonus: 2 }],
    };
    const valid = manualResultIngestor.ingest(batch, new Map([["AAA", "team-a"]]));
    expect(valid.accepted).toBe(true);
    expect(valid.results[0]).toMatchObject({ teamId: "team-a", placement: 1, kills: 5 });

    const invalid = manualResultIngestor.ingest(
      { ...batch, records: [...batch.records, { ...batch.records[0], externalId: "row-2", kills: -1 }] },
      new Map([["AAA", "team-a"]]),
    );
    expect(invalid.accepted).toBe(false);
    expect(invalid.results).toEqual([]);
    expect(invalid.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["DUPLICATE_TEAM", "INVALID_KILLS"]),
    );
  });
});

describe("demo data", () => {
  it("contains UI-ready deterministic league fixtures", () => {
    expect(demoData.tournaments).toHaveLength(5);
    expect(demoData.teams).toHaveLength(20);
    expect(demoData.players.length).toBeGreaterThanOrEqual(60);
    expect(demoData.matches).toHaveLength(15);
    expect(demoData.matches.every((match) => match.lineups.length === 20)).toBe(true);
    expect(demoData.seasonStandings).toHaveLength(20);
    expect(demoData.qualifications).toHaveLength(8);
    expect(new Set(demoData.players.map((player) => player.displayName)).size).toBe(demoData.players.length);
  });
});
