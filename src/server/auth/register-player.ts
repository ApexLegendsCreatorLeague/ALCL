import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { createActionClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ensurePlayerRecord } from "@/server/players";
import type { Database } from "@/types/database";

export type RegisterPlayerInput = {
  email: string;
  password: string;
  displayName: string;
  platform: "PC" | "PlayStation" | "Xbox" | "Nintendo Switch";
  region: "North America" | "Europe" | "Oceania" | "Asia Pacific";
  redirectBase: string;
};

export type RegisterPlayerResult =
  | { ok: true; redirectTo: "/" }
  | { ok: true; redirectTo: null; emailConfirmationRequired: true }
  | { ok: true; redirectTo: null; needsSignIn: true }
  | { ok: false; message: string };

type SignUpInput = RegisterPlayerInput;

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
  input: SignUpInput,
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
    return "Registration failed while saving your account. Run Supabase migrations (db push) on this project.";
  }
  return message || "The player account could not be created.";
}

export async function registerPlayer(input: RegisterPlayerInput): Promise<RegisterPlayerResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: "Authentication is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY on Vercel.",
    };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      message: "Registration is missing SUPABASE_SERVICE_ROLE_KEY on the server.",
    };
  }

  let userId: string | undefined;

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
    userId = data.user?.id;

    if (!userId) {
      return { ok: false, message: "Registration did not create a player account." };
    }

    await bootstrapFirstOrganizer(admin, userId);
    await provisionPlayerAccount(admin, userId, input);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Registration failed.",
    };
  }

  const supabase = await createActionClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (signInError) {
    return { ok: true, redirectTo: null, needsSignIn: true };
  }

  return { ok: true, redirectTo: "/" };
}
