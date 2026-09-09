import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/server/auth";
import { ensurePlayerRecord } from "@/server/players";

/** Redirect the signed-in user to their public profile, or a safe fallback. */
export async function redirectToMyPlayerProfile(loginNext = "/players/me") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(loginNext)}`);
  }

  const supabase = await createClient();

  try {
    await ensurePlayerRecord(supabase, user.id);
  } catch {
    redirect("/dashboard?error=profile_setup");
  }

  const { data: player, error } = await supabase
    .from("players")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (error || !player) {
    redirect("/dashboard?error=profile_setup");
  }

  redirect(`/players/${player.id}`);
}
