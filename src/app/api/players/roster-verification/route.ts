import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  evaluateRosterVerification,
  loadPlayersForVerification,
} from "@/server/rank-verification";

const schema = z.object({
  ids: z.array(z.uuid()).min(1).max(5),
  teamTag: z.string().trim().min(3).max(4),
});

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ players: [] });
  }

  const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
  const parsed = schema.safeParse({
    ids: idsParam.split(",").map((value) => value.trim()).filter(Boolean),
    teamTag: request.nextUrl.searchParams.get("teamTag") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid roster verification request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in to verify roster ranks." }, { status: 401 });
  }

  try {
    const rows = await loadPlayersForVerification(supabase, parsed.data.ids);
    const players = evaluateRosterVerification(rows, parsed.data.teamTag);
    return NextResponse.json({ players });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Roster verification failed." },
      { status: 400 },
    );
  }
}
