"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { siteUrl } from "@/lib/supabase/env";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return actionFailure("UNAUTHENTICATED", "The email or password was not accepted.");
  redirect("/dashboard");
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
  const supabase = await createClient();
  const redirectBase = siteUrl((await headers()).get("origin") ?? "http://localhost:3000");
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${redirectBase}/auth/callback` },
  });
  if (error) return actionFailure("INTERNAL_ERROR", "The sign-in link could not be sent.");
  return actionSuccess(null);
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
