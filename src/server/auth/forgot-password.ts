import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseServiceRoleKey } from "@/lib/supabase/env";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const RESET_NEXT_PATH = "/account/reset-password";
const RESET_RECOVERY_PATH = "/auth/recovery";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeAccountName(name: string) {
  return name.trim().toLocaleLowerCase("en-US");
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
    return { ok: true as const, dispatchReset: false as const };
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
    return { ok: true as const, dispatchReset: false as const };
  }

  return {
    ok: true as const,
    dispatchReset: true as const,
    email: normalizedEmail,
  };
}

export async function requestPasswordReset(email: string, accountName: string) {
  return validatePasswordResetRequest(email, accountName);
}

export { RESET_NEXT_PATH, RESET_RECOVERY_PATH };
