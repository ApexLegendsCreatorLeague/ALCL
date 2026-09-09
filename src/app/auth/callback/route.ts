import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ensurePlayerRecord } from "@/server/players";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard/player";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard/player";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user?.id) {
        try {
          await ensurePlayerRecord(supabase, data.user.id);
        } catch {
          // Dashboard will retry player provisioning.
        }
      }
      return NextResponse.redirect(new URL(safeNext, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_callback", request.url));
}
