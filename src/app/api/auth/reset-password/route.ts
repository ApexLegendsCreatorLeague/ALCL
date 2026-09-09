import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { DEFAULT_PLAYER_HOME } from "@/lib/auth/redirect-path";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Password reset is not configured." },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Choose a password with at least 8 characters." },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ ok: true, redirectTo: DEFAULT_PLAYER_HOME });
  const supabase = createRouteHandlerClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        message: "Your reset link expired or was already used. Request a new one.",
      },
      { status: 401 },
    );
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return NextResponse.json(
      { ok: false, message: "Your password could not be updated. Request a new reset link." },
      { status: 400 },
    );
  }

  return response;
}
