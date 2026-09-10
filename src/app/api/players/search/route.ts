import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ results: [] });
  }

  const parsed = z.object({ q: z.string().trim().min(2).max(50) }).safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in to search players." }, { status: 401 });
  }

  const wildcard = `%${parsed.data.q}%`;
  const [{ data: byName }, { data: byUsername }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, username")
      .eq("is_active", true)
      .ilike("display_name", wildcard)
      .limit(12),
    supabase
      .from("profiles")
      .select("id, display_name, username")
      .eq("is_active", true)
      .ilike("username", wildcard)
      .limit(12),
  ]);

  const profiles = new Map<
    string,
    { id: string; display_name: string; username: string | null }
  >();
  for (const profile of [...(byName ?? []), ...(byUsername ?? [])]) {
    profiles.set(profile.id, profile);
  }

  if (profiles.size === 0) {
    return NextResponse.json({ results: [] });
  }

  const { data: players, error } = await supabase
    .from("players")
    .select("id, profile_id, platform, rank, apex_tag, rank_verified_at")
    .in("profile_id", [...profiles.keys()]);

  if (error) {
    return NextResponse.json({ message: "Player search failed." }, { status: 400 });
  }

  const results = (players ?? [])
    .map((player) => {
      const profile = profiles.get(player.profile_id);
      if (!profile) return null;
      return {
        playerId: player.id,
        displayName: profile.display_name,
        username: profile.username,
        platform: player.platform,
        rank: player.rank,
        apexTag: player.apex_tag,
        rankVerified: Boolean(player.rank_verified_at),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .slice(0, 12);

  return NextResponse.json({ results });
}
