"use server";

import { redirect } from "next/navigation";
import {
  saveLiveApiTeamBindings,
  verifyLiveApiSession,
} from "@/server/actions/competition";

export async function saveLiveApiBinding(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const liveApiTeamKey = String(formData.get("liveApiTeamKey") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  const result = await saveLiveApiTeamBindings({
    sessionId,
    bindings: [{ liveApiTeamKey, teamId }],
  });
  const query = result.ok ? "binding=saved" : `error=${encodeURIComponent(result.message)}`;
  redirect(`/admin/live-data?${query}`);
}

export async function verifyLiveApiDraft(formData: FormData) {
  const sessionId = String(formData.get("sessionId") ?? "");
  const result = await verifyLiveApiSession(sessionId);
  const query = result.ok ? "verified=true" : `error=${encodeURIComponent(result.message)}`;
  redirect(`/admin/live-data?${query}`);
}
