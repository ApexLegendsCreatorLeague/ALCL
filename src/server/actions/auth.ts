"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { siteUrl } from "@/lib/supabase/env";
import { createActionClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { registerPlayer } from "@/server/auth/register-player";
import { actionFailure, actionSuccess, type ActionResult } from "@/server/action-result";

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
  const result = await registerPlayer({
    ...parsed.data,
    redirectBase,
  });

  if (!result.ok) {
    return actionFailure("INTERNAL_ERROR", result.message);
  }

  if (result.redirectTo) {
    return actionSuccess({ redirectTo: result.redirectTo });
  }

  if ("emailConfirmationRequired" in result && result.emailConfirmationRequired) {
    return actionSuccess({ redirectTo: null, emailConfirmationRequired: true });
  }

  return actionSuccess({ redirectTo: null, needsSignIn: true });
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
