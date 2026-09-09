import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { z } from "zod";

import { DEFAULT_PLAYER_HOME, safeNextPath } from "@/lib/auth/redirect-path";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { registerPlayerAccount } from "@/server/auth/register-player";

const schema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(2).max(50),
  platform: z.enum(["PC", "PlayStation", "Xbox", "Nintendo Switch"]).default("PC"),
  region: z.enum(["North America", "Europe", "Oceania", "Asia Pacific"]).default("North America"),
  next: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let payload: unknown;
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    payload = await request.json();
  } else {
    const formData = await request.formData();
    payload = {
      email: formData.get("email"),
      password: formData.get("password"),
      displayName: formData.get("displayName"),
      platform: formData.get("platform") ?? "PC",
      region: formData.get("region") ?? "North America",
      next: formData.get("next"),
    };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Enter a valid email, display name, platform, region, and password (8+ characters)." },
      { status: 400 },
    );
  }

  const registered = await registerPlayerAccount(parsed.data);
  if (!registered.ok) {
    return NextResponse.json(registered, { status: 422 });
  }

  const redirectTo = safeNextPath(parsed.data.next, DEFAULT_PLAYER_HOME);
  const response = NextResponse.json({ ok: true, redirectTo });
  const supabase = createRouteHandlerClient(request, response);
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: registered.email,
    password: registered.password,
  });

  if (signInError) {
    return NextResponse.json({
      ok: true,
      redirectTo: null,
      needsSignIn: true,
      message: registered.provisionWarning
        ? "Account created. Sign in to finish setup."
        : "Account created. Sign in with your email and password.",
      warning: registered.provisionWarning,
    });
  }

  if (registered.provisionWarning) {
    return NextResponse.json({
      ok: true,
      redirectTo,
      warning: registered.provisionWarning,
    });
  }

  return response;
}
