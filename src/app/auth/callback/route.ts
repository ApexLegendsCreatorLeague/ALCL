import { NextResponse, type NextRequest } from "next/server";

import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { ensurePlayerRecord } from "@/server/players";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard/player";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard/player";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth_callback", request.url));
  }

  const redirect = NextResponse.redirect(new URL(safeNext, request.url));
  const supabase = createRouteHandlerClient(request, redirect);
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth_callback", request.url));
  }

  if (data.user?.id) {
    try {
      await ensurePlayerRecord(supabase, data.user.id);
    } catch {
      // Dashboard will retry player provisioning.
    }
  }

  return redirect;
}
