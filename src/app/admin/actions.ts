"use server";

import { redirect } from "next/navigation";

import {
  addCommunitySupporter,
  createTournament,
  publishAnnouncement,
  reviewRegistration,
  saveScoringConfiguration,
  submitMatchResult,
  updateTournamentStatus,
} from "@/server/actions/competition";

function adminRedirect(section: string, query: string) {
  redirect(section ? `/admin/${section}?${query}` : `/admin?${query}`);
}

function readStatus(result: { ok: boolean; message?: string }, successKey: string, section: string) {
  const query = result.ok ? `${successKey}=true` : `error=${encodeURIComponent(result.message ?? "Request failed.")}`;
  adminRedirect(section, query);
}

function toIsoDateTime(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export async function reviewRegistrationAction(formData: FormData) {
  const result = await reviewRegistration({
    registrationId: String(formData.get("registrationId") ?? ""),
    status: String(formData.get("status") ?? "") as "approved" | "rejected" | "needs_changes",
    reason: String(formData.get("reason") ?? "") || undefined,
  });
  readStatus(result, "reviewed", "registrations");
}

export async function createTournamentAction(formData: FormData) {
  const result = await createTournament({
    seasonId: String(formData.get("seasonId") ?? ""),
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    countryCode: String(formData.get("countryCode") ?? "US"),
    maxTeams: formData.get("maxTeams") ? Number(formData.get("maxTeams")) : undefined,
    registrationOpensAt: toIsoDateTime(formData.get("registrationOpensAt")),
    registrationClosesAt: toIsoDateTime(formData.get("registrationClosesAt")),
    startsAt: toIsoDateTime(formData.get("startsAt")),
    endsAt: toIsoDateTime(formData.get("endsAt")),
  });
  readStatus(result, "created", "tournaments");
}

export async function updateTournamentStatusAction(formData: FormData) {
  const result = await updateTournamentStatus({
    tournamentId: String(formData.get("tournamentId") ?? ""),
    status: String(formData.get("status") ?? "") as
      | "draft"
      | "registration"
      | "active"
      | "complete"
      | "cancelled",
  });
  readStatus(result, "updated", "tournaments");
}

export async function submitMatchResultAction(formData: FormData) {
  const result = await submitMatchResult({
    matchId: String(formData.get("matchId") ?? ""),
    teamId: String(formData.get("teamId") ?? ""),
    placement: Number(formData.get("placement") ?? 0),
    kills: Number(formData.get("kills") ?? 0),
    bonusPoints: Number(formData.get("bonusPoints") ?? 0),
    penaltyPoints: Number(formData.get("penaltyPoints") ?? 0),
    evidencePath: String(formData.get("evidencePath") ?? "") || undefined,
  });
  readStatus(result, "result", "matches");
}

export async function saveScoringConfigAction(formData: FormData) {
  const placementPoints: Record<string, number> = {};
  for (let place = 1; place <= 20; place += 1) {
    const value = formData.get(`placement_${place}`);
    if (value !== null && value !== "") {
      placementPoints[String(place)] = Number(value);
    }
  }

  const result = await saveScoringConfiguration({
    eventId: String(formData.get("eventId") ?? ""),
    name: String(formData.get("name") ?? ""),
    placementPoints,
    pointsPerKill: Number(formData.get("pointsPerKill") ?? 1),
    maxMatches: formData.get("maxMatches") ? Number(formData.get("maxMatches")) : undefined,
  });
  readStatus(result, "saved", "scoring");
}

export async function addSupporterAction(formData: FormData) {
  const result = await addCommunitySupporter({
    name: String(formData.get("name") ?? ""),
    category: String(formData.get("category") ?? ""),
    websiteUrl: String(formData.get("websiteUrl") ?? "") || undefined,
    annualNonCashValueUsd: Number(formData.get("annualNonCashValueUsd") ?? 0),
    startsOn: String(formData.get("startsOn") ?? ""),
    endsOn: String(formData.get("endsOn") ?? "") || undefined,
  });
  readStatus(result, "added", "supporters");
}

export async function publishAnnouncementAction(formData: FormData) {
  const result = await publishAnnouncement({
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    expiresAt: String(formData.get("expiresAt") ?? "") || undefined,
  });
  readStatus(result, "published", "");
}
