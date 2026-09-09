import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl, supabaseAnonKey, supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase/env";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const RESET_NEXT_PATH = "/account/reset-password";
const RESET_RECOVERY_PATH = "/auth/recovery";
const RESET_COOKIE_NAME = "alcl_reset_dispatch";
const RESET_COOKIE_MAX_AGE_SECONDS = 5 * 60;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeAccountName(name: string) {
  return name.trim().toLocaleLowerCase("en-US");
}

function resetCookieSecret() {
  return supabaseServiceRoleKey() ?? supabaseAnonKey() ?? "alcl-reset-cookie";
}

function signResetDispatchToken(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const signature = createHmac("sha256", resetCookieSecret())
    .update(normalizedEmail)
    .digest("base64url");

  return `${normalizedEmail}.${signature}`;
}

function readResetDispatchEmail(token: string | undefined) {
  if (!token) {
    return null;
  }

  const separator = token.lastIndexOf(".");
  if (separator <= 0) {
    return null;
  }

  const email = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = createHmac("sha256", resetCookieSecret()).update(email).digest("base64url");

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  return email;
}

function mapResetEmailError(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("redirect")) {
    return "Password reset is blocked by Supabase redirect settings. Add https://thessiatournamentsite.com/auth/recovery under Authentication → URL Configuration → Redirect URLs.";
  }

  if (
    lower.includes("smtp") ||
    lower.includes("mail") ||
    lower.includes("email provider") ||
    lower.includes("send")
  ) {
    return "Supabase could not send the reset email. Check Authentication → SMTP in your Supabase project.";
  }

  return "The reset email could not be sent. Try again in a few minutes.";
}

async function findAuthUserIdByEmail(email: string) {
  const admin = createAdminClient();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw new Error(error.message);
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) {
      return match;
    }

    if (data.users.length < 200) {
      break;
    }
    page += 1;
  }

  return null;
}

function accountNameMatches(
  accountName: string,
  profileDisplayName: string | null | undefined,
  metadataDisplayName: unknown,
) {
  const expected = normalizeAccountName(accountName);
  const profileName = profileDisplayName?.trim().toLocaleLowerCase("en-US") ?? "";
  const metadataName =
    typeof metadataDisplayName === "string"
      ? metadataDisplayName.trim().toLocaleLowerCase("en-US")
      : "";

  return profileName === expected || metadataName === expected;
}

export async function validatePasswordResetRequest(email: string, accountName: string) {
  if (!isSupabaseConfigured()) {
    return {
      ok: false as const,
      message: "Password reset is not configured in this environment.",
    };
  }

  if (!supabaseServiceRoleKey()) {
    return {
      ok: false as const,
      message: "Password reset is temporarily unavailable. Contact an organizer.",
    };
  }

  const normalizedEmail = normalizeEmail(email);
  const authUser = await findAuthUserIdByEmail(normalizedEmail);

  if (!authUser) {
    return { ok: true as const, authorized: false as const };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", authUser.id)
    .maybeSingle();

  if (
    !accountNameMatches(
      accountName,
      profile?.display_name,
      authUser.user_metadata?.display_name,
    )
  ) {
    return { ok: true as const, authorized: false as const };
  }

  return {
    ok: true as const,
    authorized: true as const,
    email: normalizedEmail,
  };
}

export async function dispatchPasswordResetEmail(email: string, redirectBase: string) {
  if (!isSupabaseConfigured()) {
    return {
      ok: false as const,
      message: "Password reset is not configured in this environment.",
    };
  }

  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  if (!url || !anonKey) {
    return {
      ok: false as const,
      message: "Password reset is not configured in this environment.",
    };
  }

  const mailClient = createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const redirectTo = `${redirectBase.replace(/\/$/, "")}${RESET_RECOVERY_PATH}`;
  const { error } = await mailClient.auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo,
  });

  if (error) {
    console.error("Supabase resetPasswordForEmail failed:", error.message, { redirectTo });
    return {
      ok: false as const,
      message: mapResetEmailError(error.message),
    };
  }

  return { ok: true as const };
}

export async function requestPasswordReset(
  email: string,
  accountName: string,
  redirectBase?: string,
) {
  const validation = await validatePasswordResetRequest(email, accountName);
  if (!validation.ok) {
    return validation;
  }

  if (!validation.authorized) {
    return { ok: true as const };
  }

  return dispatchPasswordResetEmail(validation.email, redirectBase ?? siteUrl());
}

export {
  RESET_COOKIE_MAX_AGE_SECONDS,
  RESET_COOKIE_NAME,
  RESET_NEXT_PATH,
  RESET_RECOVERY_PATH,
  readResetDispatchEmail,
  signResetDispatchToken,
};
