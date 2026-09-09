"use client";

import type { EmailOtpType } from "@supabase/supabase-js";

import { DEFAULT_PLAYER_HOME, safeNextPath } from "@/lib/auth/redirect-path";
import { createBrowserSupabaseAsync } from "@/lib/supabase/browser";

export type AuthReturnFailure = "reset_expired" | "auth_callback";

export type AuthReturnOptions = {
  /** Always land on the reset-password form after a successful recovery session. */
  recoveryOnly?: boolean;
  defaultNext?: string;
};

function readHashParams() {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  return hash ? new URLSearchParams(hash) : null;
}

export function readAuthReturnFailure(): AuthReturnFailure | null {
  const hashParams = readHashParams();
  if (!hashParams) {
    return null;
  }

  const error = hashParams.get("error");
  if (!error) {
    return null;
  }

  const errorCode = hashParams.get("error_code") ?? "";
  if (errorCode === "otp_expired" || errorCode === "flow_state_expired") {
    return "reset_expired";
  }

  return "auth_callback";
}

function clearAuthReturnUrl() {
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
}

function resolveSuccessPath(options: AuthReturnOptions) {
  if (options.recoveryOnly) {
    return "/account/reset-password";
  }

  const next = new URLSearchParams(window.location.search).get("next");
  return safeNextPath(next, options.defaultNext ?? DEFAULT_PLAYER_HOME);
}

export async function completeAuthReturn(options: AuthReturnOptions = {}) {
  const hashFailure = readAuthReturnFailure();
  if (hashFailure) {
    return { ok: false as const, failure: hashFailure };
  }

  const supabase = await createBrowserSupabaseAsync();
  if (!supabase) {
    return {
      ok: false as const,
      failure: (options.recoveryOnly ? "reset_expired" : "auth_callback") as AuthReturnFailure,
    };
  }

  const query = new URLSearchParams(window.location.search);
  const code = query.get("code");
  const tokenHash = query.get("token_hash");
  const type = query.get("type");

  const hashParams = readHashParams();
  if (hashParams) {
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const hashType = hashParams.get("type");

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        return {
          ok: false as const,
          failure: (hashType === "recovery" || options.recoveryOnly
            ? "reset_expired"
            : "auth_callback") as AuthReturnFailure,
        };
      }
      clearAuthReturnUrl();
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return {
        ok: false as const,
        failure: (options.recoveryOnly ? "reset_expired" : "auth_callback") as AuthReturnFailure,
      };
    }
    clearAuthReturnUrl();
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (error) {
      return {
        ok: false as const,
        failure: (type === "recovery" || options.recoveryOnly
          ? "reset_expired"
          : "auth_callback") as AuthReturnFailure,
      };
    }
    clearAuthReturnUrl();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      failure: (options.recoveryOnly ? "reset_expired" : "auth_callback") as AuthReturnFailure,
    };
  }

  if (options.recoveryOnly || type === "recovery") {
    return { ok: true as const, redirectTo: "/account/reset-password" };
  }

  return { ok: true as const, redirectTo: resolveSuccessPath(options) };
}

export function redirectAuthReturnFailure(failure: AuthReturnFailure) {
  if (failure === "reset_expired") {
    window.location.assign("/login/forgot-password?error=reset_expired");
    return;
  }

  window.location.assign("/login?error=auth_callback");
}
