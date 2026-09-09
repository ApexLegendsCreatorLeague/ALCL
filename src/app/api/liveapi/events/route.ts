import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  normalizeLiveApiEvent,
  reduceLiveApiEvents,
  type LiveApiMatchState,
} from "@/features/data/liveapi";
import { verifyLiveApiBatchSignature } from "@/features/data/liveapi-signature";
import { createAdminClient } from "@/lib/supabase/admin";
import { materializeLiveApiResults } from "@/server/liveapi";
import type { Json, LiveApiSessionStatus } from "@/types/database";

export const runtime = "nodejs";

const batchSchema = z.object({
  sessionId: z.uuid(),
  matchId: z.uuid(),
  collectorVersion: z.string().trim().min(1).max(40),
  events: z
    .array(
      z.object({
        id: z.string().regex(/^[a-f0-9]{64}$/),
        sequence: z.number().int().positive(),
        receivedAt: z.iso.datetime(),
        body: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1)
    .max(500),
});

function json(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function verifyRequest(rawBody: string, request: NextRequest) {
  const secret = process.env.LIVEAPI_INGEST_SECRET;
  const timestamp = request.headers.get("x-alcl-timestamp");
  const signature = request.headers.get("x-alcl-signature");
  const sourceKey = request.headers.get("x-alcl-source");
  if (!secret || secret.length < 32 || !timestamp || !signature || !sourceKey) {
    return { ok: false as const, message: "LiveAPI ingestion is not configured." };
  }
  if (!/^[a-zA-Z0-9_-]{3,80}$/.test(sourceKey)) {
    return { ok: false as const, message: "Invalid collector source." };
  }
  const allowedSources = (process.env.LIVEAPI_SOURCE_KEYS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (allowedSources.length > 0 && !allowedSources.includes(sourceKey)) {
    return { ok: false as const, message: "Collector source is not authorized." };
  }
  if (
    !verifyLiveApiBatchSignature({
      secret,
      timestamp,
      rawBody,
      signature,
    })
  ) {
    return { ok: false as const, message: "Invalid collector signature." };
  }
  return { ok: true as const, sourceKey };
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2_000_000) {
    return NextResponse.json({ message: "LiveAPI batch is too large." }, { status: 413 });
  }

  const rawBody = await request.text();
  const authorization = verifyRequest(rawBody, request);
  if (!authorization.ok) {
    return NextResponse.json({ message: authorization.message }, { status: 401 });
  }

  let input: unknown;
  try {
    input = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ message: "Invalid JSON batch." }, { status: 400 });
  }
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid LiveAPI batch.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: match } = await admin
    .from("matches")
    .select("id, scoring_config_id, map_name")
    .eq("id", parsed.data.matchId)
    .maybeSingle();
  if (!match) {
    return NextResponse.json({ message: "The configured ALCL match does not exist." }, { status: 404 });
  }

  const normalized = parsed.data.events.map((event) =>
    normalizeLiveApiEvent(event),
  );
  const { data: existingSession, error: sessionLookupError } = await admin
    .from("liveapi_sessions")
    .select("*")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (sessionLookupError) {
    return NextResponse.json({ message: sessionLookupError.message }, { status: 500 });
  }
  if (existingSession && existingSession.match_id !== parsed.data.matchId) {
    return NextResponse.json(
      { message: "A LiveAPI session cannot be reassigned to another match." },
      { status: 409 },
    );
  }

  const { error: sessionError } = await admin.from("liveapi_sessions").upsert({
    id: parsed.data.sessionId,
    source_key: authorization.sourceKey,
    match_id: parsed.data.matchId,
    collector_version: parsed.data.collectorVersion,
    status: existingSession?.status ?? "waiting",
    last_event_at: new Date().toISOString(),
  });
  if (sessionError) {
    return NextResponse.json({ message: sessionError.message }, { status: 500 });
  }

  const freshEvents = normalized.filter(
    (event) => event.sequence > Number(existingSession?.last_sequence ?? 0),
  );
  if (freshEvents.length === 0) {
    return NextResponse.json({
      accepted: 0,
      status: existingSession?.status ?? "waiting",
      replay: true,
    });
  }

  const { error: rawEventError } = await admin.from("liveapi_events").upsert(
    freshEvents.map((event) => ({
      id: event.id,
      session_id: parsed.data.sessionId,
      sequence: event.sequence,
      event_type: event.type,
      occurred_at: event.occurredAt,
      received_at: new Date().toISOString(),
      payload: json(event.payload),
      normalized: json(event),
    })),
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (rawEventError) {
    return NextResponse.json({ message: rawEventError.message }, { status: 409 });
  }

  const [{ data: playerRows }, { data: teamRows }] = await Promise.all([
    admin.from("liveapi_player_states").select("*").eq("session_id", parsed.data.sessionId),
    admin.from("liveapi_team_states").select("*").eq("session_id", parsed.data.sessionId),
  ]);
  const current: LiveApiMatchState = {
    status:
      existingSession?.status === "playing" ||
      existingSession?.status === "resolution" ||
      existingSession?.status === "postmatch"
        ? existingSession.status
        : "waiting",
    mapName: existingSession?.map_name ?? match.map_name ?? undefined,
    lastSequence: Number(existingSession?.last_sequence ?? 0),
    players: Object.fromEntries(
      (playerRows ?? []).map((player) => [
        player.player_key,
        {
          key: player.player_key,
          name: player.player_name,
          teamKey: player.liveapi_team_key,
          connected: player.connected,
          kills: player.kills,
          assists: player.assists,
          damage: player.damage,
          knocks: player.knocks,
        },
      ]),
    ),
    teams: Object.fromEntries(
      (teamRows ?? []).map((team) => [
        team.liveapi_team_key,
        {
          key: team.liveapi_team_key,
          name: team.team_name ?? undefined,
          eliminated: team.eliminated,
          placement: team.placement ?? undefined,
          kills: team.kills,
          assists: team.assists,
          damage: team.damage,
          knocks: team.knocks,
        },
      ]),
    ),
  };
  const state = reduceLiveApiEvents(current, freshEvents);

  const now = new Date().toISOString();
  const [{ error: playerStateError }, { error: teamStateError }] = await Promise.all([
    admin.from("liveapi_player_states").upsert(
      Object.values(state.players).map((player) => ({
        session_id: parsed.data.sessionId,
        player_key: player.key,
        liveapi_team_key: player.teamKey,
        player_name: player.name,
        connected: player.connected,
        kills: player.kills,
        assists: player.assists,
        damage: player.damage,
        knocks: player.knocks,
        updated_at: now,
      })),
      { onConflict: "session_id,player_key" },
    ),
    admin.from("liveapi_team_states").upsert(
      Object.values(state.teams).map((team) => ({
        session_id: parsed.data.sessionId,
        liveapi_team_key: team.key,
        team_name: team.name ?? null,
        eliminated: team.eliminated,
        placement: team.placement ?? null,
        kills: team.kills,
        assists: team.assists,
        damage: team.damage,
        knocks: team.knocks,
        updated_at: now,
      })),
      { onConflict: "session_id,liveapi_team_key" },
    ),
  ]);
  if (playerStateError || teamStateError) {
    return NextResponse.json(
      { message: playerStateError?.message ?? teamStateError?.message },
      { status: 500 },
    );
  }

  let sessionStatus: LiveApiSessionStatus = state.status;
  let generatedResults = 0;
  if (state.status === "resolution" || state.status === "postmatch") {
    const materialized = await materializeLiveApiResults(admin, parsed.data.sessionId);
    sessionStatus = materialized.status;
    generatedResults = materialized.generatedResults;
    if (materialized.error) {
      await admin
        .from("liveapi_sessions")
        .update({ status: "failed", last_error: materialized.error })
        .eq("id", parsed.data.sessionId);
      return NextResponse.json({ message: materialized.error }, { status: 500 });
    }
  }

  const { error: sessionUpdateError } = await admin
    .from("liveapi_sessions")
    .update({
      status: sessionStatus,
      map_name: state.mapName ?? null,
      last_sequence: state.lastSequence,
      raw_event_count:
        Number(existingSession?.raw_event_count ?? 0) + freshEvents.length,
      processed_event_count:
        Number(existingSession?.processed_event_count ?? 0) + freshEvents.length,
      last_event_at: now,
      ended_at:
        state.status === "resolution" || state.status === "postmatch" ? now : null,
      last_error: null,
    })
    .eq("id", parsed.data.sessionId);
  if (sessionUpdateError) {
    return NextResponse.json({ message: sessionUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({
    accepted: freshEvents.length,
    status: sessionStatus,
    generatedResults,
    lastSequence: state.lastSequence,
  });
}
