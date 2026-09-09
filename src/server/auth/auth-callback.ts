import "server-only";

import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_PLAYER_HOME, safeNextPath } from "@/lib/auth/redirect-path";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { ensurePlayerRecord } from "@/server/players";
import type { Database } from "@/types/database";

export const RESET_PASSWORD_PATH = "/account/reset-password";

function resolveNextPath(nextParam: string | null, typeParam: string | null) {
  if (nextParam) {
    return safeNextPath(nextParam, DEFAULT_PLAYER_HOME);
  }

  if (typeParam === "recovery") {
    return RESET_PASSWORD_PATH;
  }

  return DEFAULT_PLAYER_HOME;
}

async function provisionPlayer(
  supabase: SupabaseClient<Database>,
  userId: string | undefined,
) {
  if (!userId) {
    return;
  }

  try {
    await ensurePlayerRecord(supabase, userId);
  } catch {
    // Dashboard will retry player provisioning.
  }
}

function authCallbackFailure(request: NextRequest, type: string | null) {
  if (type === "recovery") {
    return NextResponse.redirect(
      new URL("/login/forgot-password?error=reset_expired", request.url),
    );
  }

  return NextResponse.redirect(new URL("/login?error=auth_callback", request.url));
}

export async function handleAuthCallback(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = resolveNextPath(request.nextUrl.searchParams.get("next"), type);

  const redirect = NextResponse.redirect(new URL(next, request.url));
  const supabase = createRouteHandlerClient(request, redirect);

  if (code) {
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return authCallbackFailure(request, type);
    }

    await provisionPlayer(supabase, data.user?.id);
    return redirect;
  }

  if (tokenHash && type) {
    const { error, data } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (error) {
      return authCallbackFailure(request, type);
    }

    await provisionPlayer(supabase, data.user?.id);
    return redirect;
  }

  return authCallbackFailure(request, type);
}
