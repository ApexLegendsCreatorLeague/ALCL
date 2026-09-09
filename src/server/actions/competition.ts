"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { actionFailure, actionSuccess, type ActionResult } from "@/server/action-result";
import { requireCompetitionManager, requireUser } from "@/server/auth";
import {
  matchResultSchema,
  registrationSchema,
  supporterSchema,
  tournamentSchema,
} from "@/server/schemas";
import { materializeLiveApiResults } from "@/server/liveapi";
import type { Json, RegistrationStatus } from "@/types/database";

function invalid(error: z.ZodError): ActionResult<never> {
  return actionFailure("INVALID_INPUT", "Review the highlighted fields.", {
    fieldErrors: error.flatten().fieldErrors,
  });
}

const toJson = (value: unknown): Json =>
  JSON.parse(JSON.stringify(value)) as Json;

export async function submitRegistration(
  input: z.input<typeof registrationSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const user = await requireUser();
  const supabase = await createClient();

  const { data: rule } = await supabase
    .from("rules")
    .select("id, tournament_id, status, published_at, content_hash")
    .eq("id", parsed.data.acceptedRuleId)
    .eq("tournament_id", parsed.data.tournamentId)
    .eq("status", "published")
    .not("published_at", "is", null)
    .maybeSingle();
  if (!rule) {
    return actionFailure("CONFLICT", "Registration requires the published event-specific rules.");
  }

  const { data, error } = await supabase
    .from("registrations")
    .insert({
      tournament_id: parsed.data.tournamentId,
      team_id: parsed.data.teamId,
      roster_id: parsed.data.rosterId,
      submitted_by: user.id,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !data) return actionFailure("CONFLICT", error?.message ?? "Registration failed.");

  const snapshot = {
    registrationId: data.id,
    rosterId: parsed.data.rosterId,
    acceptedRuleId: rule.id,
    acceptedRuleHash: rule.content_hash,
    capturedAt: new Date().toISOString(),
  };
  const contentHash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
  const { error: snapshotError } = await supabase.from("registration_snapshots").insert({
    registration_id: data.id,
    version: 1,
    snapshot,
    content_hash: contentHash,
    created_by: user.id,
  });
  if (snapshotError) {
    return actionFailure("INTERNAL_ERROR", "Registration was created but its audit snapshot failed.");
  }
  revalidatePath("/dashboard");
  return actionSuccess({ id: data.id });
}

export async function reviewRegistration(input: {
  registrationId: string;
  status: Extract<RegistrationStatus, "approved" | "rejected" | "needs_changes">;
  reason?: string;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object({
    registrationId: z.uuid(),
    status: z.enum(["approved", "rejected", "needs_changes"]),
    reason: z.string().trim().max(1000).optional(),
  }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { user } = await requireCompetitionManager();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("registrations")
    .update({
      status: parsed.data.status,
      rejection_reason: parsed.data.reason ?? null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.registrationId)
    .select("id")
    .single();
  if (error || !data) return actionFailure("CONFLICT", error?.message ?? "Review failed.");
  revalidatePath("/admin/registrations");
  return actionSuccess(data);
}

export async function createTournament(
  input: z.input<typeof tournamentSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = tournamentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  await requireCompetitionManager();
  const supabase = await createClient();
  const { data, error } = await supabase.from("tournaments").insert({
    season_id: parsed.data.seasonId,
    name: parsed.data.name,
    slug: parsed.data.slug,
    format: "online",
    country_code: parsed.data.countryCode,
    status: "draft",
    registration_opens_at: parsed.data.registrationOpensAt ?? null,
    registration_closes_at: parsed.data.registrationClosesAt ?? null,
    starts_at: parsed.data.startsAt ?? null,
    ends_at: parsed.data.endsAt ?? null,
    max_teams: parsed.data.maxTeams ?? null,
  }).select("id").single();
  if (error || !data) return actionFailure("CONFLICT", error?.message ?? "Tournament creation failed.");
  revalidatePath("/admin/tournaments");
  revalidatePath("/tournaments");
  return actionSuccess(data);
}

export async function submitMatchResult(
  input: z.input<typeof matchResultSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = matchResultSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { user } = await requireCompetitionManager();
  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("scoring_config_id")
    .eq("id", parsed.data.matchId)
    .single();
  if (!match) return actionFailure("CONFLICT", "The selected match does not exist.");
  const { data: scoring } = await supabase
    .from("scoring_configs")
    .select("placement_points, points_per_kill")
    .eq("id", match.scoring_config_id)
    .single();
  if (!scoring) return actionFailure("CONFLICT", "The match has no scoring configuration.");
  const placementTable = scoring.placement_points as Record<string, number>;
  const placementPoints = Number(placementTable[String(parsed.data.placement)] ?? 0);
  const killPoints = parsed.data.kills * Number(scoring.points_per_kill);
  const { data, error } = await supabase.from("match_results").insert({
    match_id: parsed.data.matchId,
    team_id: parsed.data.teamId,
    placement: parsed.data.placement,
    kills: parsed.data.kills,
    placement_points: placementPoints,
    kill_points: killPoints,
    bonus_points: parsed.data.bonusPoints,
    penalty_points: parsed.data.penaltyPoints,
    evidence_path: parsed.data.evidencePath ?? null,
    submitted_by: user.id,
  }).select("id").single();
  if (error || !data) return actionFailure("CONFLICT", error?.message ?? "Result entry failed.");
  revalidatePath("/admin/matches");
  return actionSuccess(data);
}

export async function addCommunitySupporter(
  input: z.input<typeof supporterSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = supporterSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { user } = await requireCompetitionManager();
  const supabase = await createClient();
  const { data, error } = await supabase.from("community_supporters").insert({
    name: parsed.data.name,
    category: parsed.data.category,
    website_url: parsed.data.websiteUrl ?? null,
    annual_non_cash_value_usd: parsed.data.annualNonCashValueUsd,
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn ?? null,
    approved_by: user.id,
  }).select("id").single();
  if (error || !data) return actionFailure("CONFLICT", error?.message ?? "Supporter review failed.");
  revalidatePath("/admin/supporters");
  revalidatePath("/supporters");
  return actionSuccess(data);
}

export async function publishTournamentRules(input: {
  tournamentId: string;
  version: number;
  title: string;
  body: string;
  effectiveAt: string;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object({
    tournamentId: z.uuid(),
    version: z.number().int().positive(),
    title: z.string().trim().min(3).max(150),
    body: z.string().trim().min(100).max(100_000),
    effectiveAt: z.iso.datetime(),
  }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { user } = await requireCompetitionManager();
  const contentHash = createHash("sha256").update(parsed.data.body).digest("hex");
  const supabase = await createClient();
  const { data, error } = await supabase.from("rules").insert({
    tournament_id: parsed.data.tournamentId,
    version: parsed.data.version,
    title: parsed.data.title,
    body: parsed.data.body,
    content_hash: contentHash,
    status: "published",
    effective_at: parsed.data.effectiveAt,
    published_at: new Date().toISOString(),
    created_by: user.id,
  }).select("id").single();
  if (error || !data) return actionFailure("CONFLICT", error?.message ?? "Rules publication failed.");
  revalidatePath(`/tournaments/${parsed.data.tournamentId}/rules`);
  return actionSuccess(data);
}

export async function saveScoringConfiguration(input: {
  eventId: string;
  name: string;
  placementPoints: Record<string, number>;
  pointsPerKill: number;
  bonuses?: unknown[];
  penalties?: unknown[];
  multipliers?: Record<string, number>;
  tiebreakers?: unknown[];
  maxMatches?: number;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object({
    eventId: z.uuid(),
    name: z.string().trim().min(3).max(100),
    placementPoints: z.record(z.string(), z.number().nonnegative()),
    pointsPerKill: z.number().nonnegative().max(100),
    bonuses: z.array(z.unknown()).default([]),
    penalties: z.array(z.unknown()).default([]),
    multipliers: z.record(z.string(), z.number().positive()).default({}),
    tiebreakers: z.array(z.unknown()).default([]),
    maxMatches: z.number().int().positive().max(100).optional(),
  }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { user } = await requireCompetitionManager();
  const supabase = await createClient();
  const { data, error } = await supabase.from("scoring_configs").insert({
    event_id: parsed.data.eventId,
    name: parsed.data.name,
    placement_points: parsed.data.placementPoints,
    points_per_kill: parsed.data.pointsPerKill,
    bonus_rules: toJson(parsed.data.bonuses),
    penalty_rules: toJson(parsed.data.penalties),
    match_multipliers: parsed.data.multipliers,
    tiebreakers: toJson(parsed.data.tiebreakers),
    max_matches: parsed.data.maxMatches ?? null,
    created_by: user.id,
  }).select("id").single();
  if (error || !data) return actionFailure("CONFLICT", error?.message ?? "Scoring configuration failed.");
  revalidatePath("/admin/scoring");
  return actionSuccess(data);
}

export async function publishAnnouncement(input: {
  leagueId?: string;
  title: string;
  body: string;
  expiresAt?: string;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object({
    leagueId: z.uuid().optional(),
    title: z.string().trim().min(3).max(160),
    body: z.string().trim().min(10).max(10_000),
    expiresAt: z.iso.datetime().optional(),
  }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { user } = await requireCompetitionManager();
  const supabase = await createClient();
  const { data, error } = await supabase.from("announcements").insert({
    league_id: parsed.data.leagueId ?? null,
    title: parsed.data.title,
    body: parsed.data.body,
    status: "published",
    published_at: new Date().toISOString(),
    expires_at: parsed.data.expiresAt ?? null,
    created_by: user.id,
  }).select("id").single();
  if (error || !data) return actionFailure("CONFLICT", error?.message ?? "Announcement failed.");
  revalidatePath("/tournaments");
  return actionSuccess(data);
}

export async function recalculateEventStandings(
  eventId: string,
): Promise<ActionResult<{ teams: number }>> {
  const parsed = z.uuid().safeParse(eventId);
  if (!parsed.success) return actionFailure("INVALID_INPUT", "Invalid event.");
  await requireCompetitionManager();
  const supabase = await createClient();
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id")
    .eq("event_id", parsed.data);
  if (matchesError) return actionFailure("INTERNAL_ERROR", matchesError.message);
  const matchIds = matches.map(({ id }) => id);
  if (matchIds.length === 0) return actionSuccess({ teams: 0 });
  const { data: results, error } = await supabase
    .from("match_results")
    .select("team_id, placement, kills, total_points")
    .in("match_id", matchIds)
    .not("verified_at", "is", null);
  if (error) return actionFailure("INTERNAL_ERROR", error.message);

  const totals = new Map<string, { matchPoints: number; kills: number; wins: number }>();
  for (const result of results) {
    const current = totals.get(result.team_id) ?? { matchPoints: 0, kills: 0, wins: 0 };
    current.matchPoints += Number(result.total_points);
    current.kills += result.kills;
    current.wins += result.placement === 1 ? 1 : 0;
    totals.set(result.team_id, current);
  }
  const rows = [...totals.entries()].map(([teamId, total]) => ({
    event_id: parsed.data,
    team_id: teamId,
    match_points: total.matchPoints,
    kills: total.kills,
    wins: total.wins,
    finalized_at: new Date().toISOString(),
  }));
  const { error: upsertError } = await supabase
    .from("event_points")
    .upsert(rows, { onConflict: "event_id,team_id" });
  if (upsertError) return actionFailure("INTERNAL_ERROR", upsertError.message);
  revalidatePath("/standings");
  return actionSuccess({ teams: rows.length });
}

export async function saveLiveApiTeamBindings(input: {
  sessionId: string;
  bindings: { liveApiTeamKey: string; teamId: string }[];
}): Promise<ActionResult<{ generatedResults: number }>> {
  const parsed = z.object({
    sessionId: z.uuid(),
    bindings: z.array(z.object({
      liveApiTeamKey: z.string().trim().min(1).max(100),
      teamId: z.uuid(),
    })).min(1).max(30),
  }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { user } = await requireCompetitionManager();
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("liveapi_sessions")
    .select("match_id")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!session) return actionFailure("CONFLICT", "LiveAPI session not found.");
  const { data: matchTeams } = await supabase
    .from("match_teams")
    .select("team_id")
    .eq("match_id", session.match_id);
  const allowedTeamIds = new Set((matchTeams ?? []).map(({ team_id }) => team_id));
  if (parsed.data.bindings.some(({ teamId }) => !allowedTeamIds.has(teamId))) {
    return actionFailure("INVALID_INPUT", "Every binding must use a team in this match.");
  }
  if (
    new Set(parsed.data.bindings.map(({ liveApiTeamKey }) => liveApiTeamKey)).size !==
      parsed.data.bindings.length ||
    new Set(parsed.data.bindings.map(({ teamId }) => teamId)).size !==
      parsed.data.bindings.length
  ) {
    return actionFailure("INVALID_INPUT", "Each LiveAPI team and ALCL team may be bound once.");
  }
  const now = new Date().toISOString();
  const { error } = await supabase.from("liveapi_team_bindings").upsert(
    parsed.data.bindings.map((binding) => ({
      session_id: parsed.data.sessionId,
      liveapi_team_key: binding.liveApiTeamKey,
      team_id: binding.teamId,
      verified_by: user.id,
      verified_at: now,
    })),
    { onConflict: "session_id,liveapi_team_key" },
  );
  if (error) return actionFailure("CONFLICT", error.message);

  const materialized = await materializeLiveApiResults(supabase, parsed.data.sessionId);
  await supabase
    .from("liveapi_sessions")
    .update({ status: materialized.status, last_error: materialized.error ?? null })
    .eq("id", parsed.data.sessionId);
  if (materialized.error) {
    return actionFailure("INTERNAL_ERROR", materialized.error);
  }
  revalidatePath("/admin/matches");
  revalidatePath("/admin/live-data");
  return actionSuccess({ generatedResults: materialized.generatedResults });
}

export async function verifyLiveApiSession(
  sessionId: string,
): Promise<ActionResult<{ results: number }>> {
  const parsed = z.uuid().safeParse(sessionId);
  if (!parsed.success) return actionFailure("INVALID_INPUT", "Invalid LiveAPI session.");
  const { user } = await requireCompetitionManager();
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("liveapi_sessions")
    .select("match_id, status")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!session || session.status !== "ready_for_review") {
    return actionFailure("CONFLICT", "Generate and review the LiveAPI draft before verifying it.");
  }
  const now = new Date().toISOString();
  const { data: results, error } = await supabase
    .from("match_results")
    .update({
      verified_by: user.id,
      verified_at: now,
      review_status: "verified",
    })
    .eq("source_session_id", parsed.data)
    .eq("ingestion_source", "liveapi")
    .select("id");
  if (error || !results?.length) {
    return actionFailure("CONFLICT", error?.message ?? "No LiveAPI results are ready.");
  }
  await Promise.all([
    supabase
      .from("match_player_results")
      .update({ verified_at: now })
      .eq("source_session_id", parsed.data),
    supabase
      .from("liveapi_sessions")
      .update({ status: "verified" })
      .eq("id", parsed.data),
    supabase.from("matches").update({ status: "complete" }).eq("id", session.match_id),
  ]);
  const { data: match } = await supabase
    .from("matches")
    .select("event_id")
    .eq("id", session.match_id)
    .single();
  if (match) await recalculateEventStandings(match.event_id);
  revalidatePath("/admin/live-data");
  revalidatePath("/standings");
  return actionSuccess({ results: results.length });
}
