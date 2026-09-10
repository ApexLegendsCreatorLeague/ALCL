import { NextResponse } from "next/server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ensurePlayerRecord } from "@/server/players";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ message: "Authentication is not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  }

  try {
    await ensurePlayerRecord(supabase, user.id);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Player profile unavailable." },
      { status: 400 },
    );
  }

  const [{ data: player, error: playerError }, { data: profile }] = await Promise.all([
    supabase
      .from("players")
      .select("id, platform, rank, apex_tag, rank_verified_at")
      .eq("profile_id", user.id)
      .single(),
    supabase.from("profiles").select("display_name, username").eq("id", user.id).single(),
  ]);

  if (playerError || !player) {
    return NextResponse.json({ message: "Player profile not found." }, { status: 404 });
  }

  return NextResponse.json({
    playerId: player.id,
    profileId: user.id,
    displayName: profile?.display_name ?? "Player",
    username: profile?.username ?? null,
    email: user.email ?? null,
    platform: player.platform,
    rank: player.rank,
    apexTag: player.apex_tag,
    rankVerifiedAt: player.rank_verified_at,
  });
}
