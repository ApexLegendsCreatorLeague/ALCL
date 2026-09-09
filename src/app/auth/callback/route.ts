import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_PLAYER_HOME, safeNextPath } from "@/lib/auth/redirect-path";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { ensurePlayerRecord } from "@/server/players";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"), DEFAULT_PLAYER_HOME);

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth_callback", request.url));
  }

  const redirect = NextResponse.redirect(new URL(next, request.url));
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
