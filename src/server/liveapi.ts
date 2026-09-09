import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LiveApiSessionStatus } from "@/types/database";

export async function materializeLiveApiResults(
  admin: SupabaseClient<Database>,
  sessionId: string,
): Promise<{
  status: LiveApiSessionStatus;
  generatedResults: number;
  error?: string;
}> {
  const { data: session } = await admin
    .from("liveapi_sessions")
    .select("id, match_id, map_name")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { status: "failed", generatedResults: 0, error: "Session not found." };

  const [{ data: match }, { data: teams }, { data: players }, { data: bindings }] =
    await Promise.all([
      admin
        .from("matches")
        .select("id, scoring_config_id, map_name")
        .eq("id", session.match_id)
        .single(),
      admin
        .from("liveapi_team_states")
        .select("*")
        .eq("session_id", sessionId)
        .not("placement", "is", null),
      admin.from("liveapi_player_states").select("*").eq("session_id", sessionId),
      admin
        .from("liveapi_team_bindings")
        .select("liveapi_team_key, team_id")
        .eq("session_id", sessionId),
    ]);
  if (!match) {
    return { status: "failed", generatedResults: 0, error: "Match not found." };
  }

  const teamIds = new Map(
    (bindings ?? []).map((binding) => [binding.liveapi_team_key, binding.team_id]),
  );
  const fullyMapped =
    (teams?.length ?? 0) > 0 &&
    (teams ?? []).every((team) => teamIds.has(team.liveapi_team_key));
  if (!fullyMapped) return { status: "needs_mapping", generatedResults: 0 };

  const { data: scoring } = await admin
    .from("scoring_configs")
    .select("placement_points, points_per_kill")
    .eq("id", match.scoring_config_id)
    .single();
  if (!scoring) {
    return {
      status: "failed",
      generatedResults: 0,
      error: "Scoring configuration not found.",
    };
  }

  const placementPoints = scoring.placement_points as Record<string, number>;
  const { error: resultsError } = await admin.from("match_results").upsert(
    (teams ?? []).map((team) => ({
      match_id: session.match_id,
      team_id: teamIds.get(team.liveapi_team_key)!,
      placement: team.placement!,
      kills: team.kills,
      placement_points: Number(placementPoints[String(team.placement)] ?? 0),
      kill_points: team.kills * Number(scoring.points_per_kill),
      bonus_points: 0,
      penalty_points: 0,
      submitted_by: null,
      ingestion_source: "liveapi" as const,
      source_session_id: sessionId,
      review_status: "pending" as const,
    })),
    { onConflict: "match_id,team_id" },
  );
  if (resultsError) {
    return { status: "failed", generatedResults: 0, error: resultsError.message };
  }

  const playerResults = (players ?? [])
    .filter((player) => teamIds.has(player.liveapi_team_key))
    .map((player) => ({
      match_id: session.match_id,
      team_id: teamIds.get(player.liveapi_team_key)!,
      player_id: null,
      source_player_name: player.player_name,
      kills: player.kills,
      assists: player.assists,
      damage: player.damage,
      knocks: player.knocks,
      source_session_id: sessionId,
    }));
  if (playerResults.length > 0) {
    const { error } = await admin.from("match_player_results").upsert(playerResults, {
      onConflict: "match_id,source_session_id,source_player_name",
    });
    if (error) return { status: "failed", generatedResults: 0, error: error.message };
  }

  await admin
    .from("matches")
    .update({ status: "submitted", map_name: session.map_name ?? match.map_name })
    .eq("id", session.match_id);
  return { status: "ready_for_review", generatedResults: teams?.length ?? 0 };
}
