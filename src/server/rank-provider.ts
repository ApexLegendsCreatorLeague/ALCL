import "server-only";

import {
  dbPlatformToApiPlatform,
  normalizeApexRankName,
  type CompetitionRank,
} from "@/lib/apex-rank";
import { normalizePlayerName } from "@/server/liveapi-player-match";

export type DbPlatform = "pc" | "playstation" | "xbox" | "switch";

export type VerifiedApexRank = {
  readonly uid: string;
  readonly name: string;
  readonly rank: CompetitionRank;
  readonly platform: DbPlatform;
  readonly raw: Record<string, unknown>;
};

export class RankProviderError extends Error {
  constructor(
    readonly code: "NOT_CONFIGURED" | "NOT_FOUND" | "NAME_MISMATCH" | "INVALID_RANK" | "UPSTREAM",
    message: string,
  ) {
    super(message);
    this.name = "RankProviderError";
  }
}

export {
  dbPlatformToApiPlatform,
  isValidApexTag,
  normalizeApexRankName,
  normalizeApexTag,
  rankMeetsMinimum,
  type CompetitionRank,
} from "@/lib/apex-rank";

function parseBridgeResponse(payload: unknown, expectedName: string, platform: DbPlatform): VerifiedApexRank {
  if (!payload || typeof payload !== "object") {
    throw new RankProviderError("UPSTREAM", "Rank provider returned an invalid response.");
  }

  const body = payload as Record<string, unknown>;
  if (typeof body.error === "string" && body.error.trim()) {
    if (/not found|invalid player|no player/i.test(body.error)) {
      throw new RankProviderError("NOT_FOUND", "No Apex account matched that name and platform.");
    }
    throw new RankProviderError("UPSTREAM", body.error);
  }

  const global = body.global;
  if (!global || typeof global !== "object") {
    throw new RankProviderError("NOT_FOUND", "No Apex account matched that name and platform.");
  }

  const globalInfo = global as Record<string, unknown>;
  const uid = globalInfo.uid;
  const name = typeof globalInfo.name === "string" ? globalInfo.name : "";
  if (uid === undefined || uid === null || !name) {
    throw new RankProviderError("NOT_FOUND", "No Apex account matched that name and platform.");
  }

  if (normalizePlayerName(name) !== normalizePlayerName(expectedName)) {
    throw new RankProviderError(
      "NAME_MISMATCH",
      `Apex returned "${name}" but your ALCL display name must match exactly.`,
    );
  }

  const rankBlock = globalInfo.rank;
  const rankName =
    rankBlock && typeof rankBlock === "object"
      ? (rankBlock as Record<string, unknown>).rankName
      : globalInfo.rankName;
  const rank = normalizeApexRankName(typeof rankName === "string" ? rankName : null);
  if (!rank) {
    throw new RankProviderError("INVALID_RANK", "Could not read a supported ranked tier from Apex.");
  }

  return {
    uid: String(uid),
    name,
    rank,
    platform,
    raw: body,
  };
}

export async function fetchVerifiedApexRank(
  playerName: string,
  platform: DbPlatform,
): Promise<VerifiedApexRank> {
  const apiKey = process.env.APEX_STATS_API_KEY?.trim();
  if (!apiKey) {
    throw new RankProviderError(
      "NOT_CONFIGURED",
      "Rank verification is not configured. Contact the league organizer.",
    );
  }

  const baseUrl = (process.env.APEX_STATS_API_URL ?? "https://api.mozambiquehe.re").replace(/\/$/, "");
  const url = new URL(`${baseUrl}/bridge`);
  url.searchParams.set("auth", apiKey);
  url.searchParams.set("player", playerName.trim());
  url.searchParams.set("platform", dbPlatformToApiPlatform(platform));
  url.searchParams.set("version", "5");

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
  } catch {
    throw new RankProviderError("UPSTREAM", "Rank provider could not be reached.");
  }

  if (response.status === 404) {
    throw new RankProviderError("NOT_FOUND", "No Apex account matched that name and platform.");
  }

  if (!response.ok) {
    throw new RankProviderError("UPSTREAM", `Rank provider error (${response.status}).`);
  }

  const payload = (await response.json()) as unknown;
  return parseBridgeResponse(payload, playerName, platform);
}

export async function fetchVerifiedApexRankByUid(
  uid: string,
  platform: DbPlatform,
): Promise<VerifiedApexRank> {
  const apiKey = process.env.APEX_STATS_API_KEY?.trim();
  if (!apiKey) {
    throw new RankProviderError(
      "NOT_CONFIGURED",
      "Rank verification is not configured. Contact the league organizer.",
    );
  }

  const baseUrl = (process.env.APEX_STATS_API_URL ?? "https://api.mozambiquehe.re").replace(/\/$/, "");
  const url = new URL(`${baseUrl}/bridge`);
  url.searchParams.set("auth", apiKey);
  url.searchParams.set("uid", uid.trim());
  url.searchParams.set("platform", dbPlatformToApiPlatform(platform));
  url.searchParams.set("version", "5");

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new RankProviderError("UPSTREAM", `Rank provider error (${response.status}).`);
  }

  const payload = (await response.json()) as unknown;
  if (!payload || typeof payload !== "object") {
    throw new RankProviderError("UPSTREAM", "Rank provider returned an invalid response.");
  }

  const body = payload as Record<string, unknown>;
  const global = body.global;
  if (!global || typeof global !== "object") {
    throw new RankProviderError("NOT_FOUND", "Verified UID no longer returned rank data.");
  }

  const globalInfo = global as Record<string, unknown>;
  const name = typeof globalInfo.name === "string" ? globalInfo.name : "";
  const rankBlock = globalInfo.rank;
  const rankName =
    rankBlock && typeof rankBlock === "object"
      ? (rankBlock as Record<string, unknown>).rankName
      : globalInfo.rankName;
  const rank = normalizeApexRankName(typeof rankName === "string" ? rankName : null);
  if (!rank || !name) {
    throw new RankProviderError("INVALID_RANK", "Could not refresh rank for this verified account.");
  }

  return {
    uid: String(globalInfo.uid ?? uid),
    name,
    rank,
    platform,
    raw: body,
  };
}
