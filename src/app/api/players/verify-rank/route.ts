import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ensurePlayerRecord } from "@/server/players";
import { RankProviderError } from "@/server/rank-provider";
import { verifyPlayerRankWithTeamTag } from "@/server/rank-verification";

const schema = z.object({
  teamTag: z.string().trim().min(3).max(4),
});

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ message: "Authentication is not configured." }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Team Tag must be 3-4 characters." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in to verify rank." }, { status: 401 });
  }

  let playerId: string;
  try {
    playerId = await ensurePlayerRecord(supabase, user.id);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Player profile unavailable." },
      { status: 400 },
    );
  }

  try {
    const result = await verifyPlayerRankWithTeamTag(
      supabase,
      playerId,
      user.id,
      parsed.data.teamTag,
    );
    return NextResponse.json({
      ok: true,
      rank: result.rank,
      apexTag: result.apexTag,
      uid: result.uid,
      apexName: result.apexName,
      verifiedAt: result.verifiedAt,
      message: `Verified ${result.rank} with team Tag ${result.apexTag}.`,
    });
  } catch (error) {
    if (error instanceof RankProviderError) {
      const status =
        error.code === "NOT_CONFIGURED"
          ? 503
          : error.code === "NOT_FOUND" || error.code === "NAME_MISMATCH"
            ? 422
            : 400;
      return NextResponse.json({ ok: false, message: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Rank verification failed." },
      { status: 500 },
    );
  }
}
