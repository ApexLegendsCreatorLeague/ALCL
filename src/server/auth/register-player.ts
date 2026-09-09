import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseServiceRoleKey } from "@/lib/supabase/env";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { ensurePlayerRecord } from "@/server/players";
import type { Database } from "@/types/database";

export type RegisterPlayerInput = {
  email: string;
  password: string;
  displayName: string;
  platform: "PC" | "PlayStation" | "Xbox" | "Nintendo Switch";
  region: "North America" | "Europe" | "Oceania" | "Asia Pacific";
};

export type RegisterPlayerResult =
  | { ok: true; email: string; password: string }
  | { ok: false; message: string };

async function bootstrapFirstOrganizer(admin: SupabaseClient<Database>, userId: string) {
  const { count, error } = await admin
    .from("profile_roles")
    .select("*", { count: "exact", head: true })
    .in("role", ["admin", "organizer"]);
  if (error || (count ?? 0) > 0) return;

  await admin.from("profile_roles").upsert(
    [
      { profile_id: userId, role: "organizer", granted_by: userId },
      { profile_id: userId, role: "admin", granted_by: userId },
    ],
    { onConflict: "profile_id,role", ignoreDuplicates: true },
  );
}

async function provisionPlayerAccount(
  admin: SupabaseClient<Database>,
  userId: string,
  input: RegisterPlayerInput,
) {
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      display_name: input.displayName,
    },
    { onConflict: "id" },
  );
  if (profileError) {
    throw new Error(`Profile setup failed: ${profileError.message}`);
  }

  const { error: roleError } = await admin.from("profile_roles").upsert(
    { profile_id: userId, role: "player" },
    { onConflict: "profile_id,role", ignoreDuplicates: true },
  );
  if (roleError) {
    throw new Error(`Player role setup failed: ${roleError.message}`);
  }

  await ensurePlayerRecord(admin, userId, {
    platform: input.platform,
    region: input.region,
  });
}

function mapSignUpError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("already") || normalized.includes("registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (normalized.includes("database error")) {
    return "Database schema is missing. Run: supabase db push";
  }
  return message || "The player account could not be created.";
}

export async function registerPlayerAccount(input: RegisterPlayerInput): Promise<RegisterPlayerResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message:
        "Supabase is not configured. In Vercel → Settings → Environment Variables, add SUPABASE_URL and SUPABASE_ANON_KEY for Production, save, then Redeploy. Check /api/auth/status on your site.",
    };
  }

  if (!supabaseServiceRoleKey()) {
    return {
      ok: false,
      message: "Set SUPABASE_SERVICE_ROLE_KEY in Vercel env vars (Production), then redeploy.",
    };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { display_name: input.displayName },
    });
    if (error) {
      return { ok: false, message: mapSignUpError(error.message) };
    }

    const userId = data.user?.id;
    if (!userId) {
      return { ok: false, message: "Registration did not create a player account." };
    }

    await bootstrapFirstOrganizer(admin, userId);
    await provisionPlayerAccount(admin, userId, input);

    return { ok: true, email: input.email, password: input.password };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Registration failed.",
    };
  }
}
