"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { siteUrl } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createActionClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ensurePlayerRecord } from "@/server/players";
import { actionFailure, actionSuccess, type ActionResult } from "@/server/action-result";

async function bootstrapFirstOrganizer(userId: string) {
  const admin = createAdminClient();
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

const emailSchema = z.email().max(254);
const passwordSchema = z.string().min(8).max(128);

export async function signInWithPassword(
  _previous: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  if (!isSupabaseConfigured()) {
    return actionFailure("INTERNAL_ERROR", "Authentication is not configured in this environment.");
  }
  const parsed = z.object({
    email: emailSchema,
    password: passwordSchema,
  }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return actionFailure("INVALID_INPUT", "Enter a valid email and ALCL password.", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }
  const supabase = await createActionClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const message = error.message.toLowerCase().includes("confirm")
      ? "Confirm your email first, then sign in."
      : "The email or password was not accepted.";
    return actionFailure("UNAUTHENTICATED", message);
  }
  return actionSuccess(null);
}

type SignUpResult = {
  redirectTo: "/" | null;
  emailConfirmationRequired?: boolean;
  needsSignIn?: boolean;
};

type SignUpInput = {
  email: string;
  password: string;
  displayName: string;
  platform: "PC" | "PlayStation" | "Xbox" | "Nintendo Switch";
  region: "North America" | "Europe" | "Oceania" | "Asia Pacific";
};

async function provisionPlayerAccount(userId: string, input: SignUpInput) {
  const admin = createAdminClient();
  await admin.from("profiles").upsert(
    {
      id: userId,
      display_name: input.displayName,
    },
    { onConflict: "id" },
  );
  await admin.from("profile_roles").upsert(
    { profile_id: userId, role: "player" },
    { onConflict: "profile_id,role", ignoreDuplicates: true },
  );
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
  if (normalized.includes("password")) {
    return message;
  }
  if (normalized.includes("database error")) {
    return "Registration failed while saving your account. Confirm Supabase migrations are applied.";
  }
  return message || "The player account could not be created.";
}

export async function signUpWithPassword(
  _previous: ActionResult<SignUpResult> | null,
  formData: FormData,
): Promise<ActionResult<SignUpResult>> {
  if (!isSupabaseConfigured()) {
    return actionFailure("INTERNAL_ERROR", "Authentication is not configured in this environment.");
  }
  const parsed = z
    .object({
      email: emailSchema,
      password: passwordSchema,
      displayName: z.string().trim().min(2).max(50),
      platform: z.enum(["PC", "PlayStation", "Xbox", "Nintendo Switch"]).default("PC"),
      region: z.enum(["North America", "Europe", "Oceania", "Asia Pacific"]).default("North America"),
    })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      displayName: formData.get("displayName"),
      platform: formData.get("platform") ?? "PC",
      region: formData.get("region") ?? "North America",
    });
  if (!parsed.success) {
    return actionFailure(
      "INVALID_INPUT",
      "Enter a valid email, display name, platform, region, and password (8+ characters).",
      { fieldErrors: parsed.error.flatten().fieldErrors },
    );
  }

  const redirectBase = siteUrl((await headers()).get("origin") ?? "http://localhost:3000");
  let userId: string | undefined;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { display_name: parsed.data.displayName },
    });
    if (error) {
      return actionFailure("CONFLICT", mapSignUpError(error.message));
    }
    userId = data.user?.id;
  } catch {
    const supabase = await createActionClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${redirectBase}/auth/callback?next=/`,
        data: { display_name: parsed.data.displayName },
      },
    });
    if (error) {
      return actionFailure("CONFLICT", mapSignUpError(error.message));
    }
    if (!data.user?.id) {
      return actionFailure(
        "INTERNAL_ERROR",
        "Registration did not create a player account. Confirm sign-ups are enabled in Supabase Auth.",
      );
    }
    userId = data.user.id;
    if (!data.session) {
      return actionSuccess({
        redirectTo: null,
        emailConfirmationRequired: true,
      });
    }
  }

  if (!userId) {
    return actionFailure("INTERNAL_ERROR", "Registration did not create a player account.");
  }

  try {
    await bootstrapFirstOrganizer(userId);
    await provisionPlayerAccount(userId, parsed.data);
  } catch (error) {
    return actionFailure(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Your account was created but player setup failed.",
    );
  }

  const supabase = await createActionClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInError) {
    return actionSuccess({ redirectTo: null, needsSignIn: true });
  }

  return actionSuccess({ redirectTo: "/" });
}

export async function sendMagicLink(
  _previous: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  if (!isSupabaseConfigured()) {
    return actionFailure("INTERNAL_ERROR", "Authentication is not configured in this environment.");
  }
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return actionFailure("INVALID_INPUT", "Enter a valid email address.");
  const supabase = await createActionClient();
  const redirectBase = siteUrl((await headers()).get("origin") ?? "http://localhost:3000");
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${redirectBase}/auth/callback?next=/` },
  });
  if (error) return actionFailure("INTERNAL_ERROR", "The sign-in link could not be sent.");
  return actionSuccess(null);
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createActionClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
