import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
import { z } from "zod";

import { createRouteHandlerClient } from "@/lib/supabase/route-handler";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const schema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, message: "Set SUPABASE_URL and SUPABASE_ANON_KEY on Vercel." },
      { status: 503 },
    );
  }

  let payload: unknown;
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    payload = await request.json();
  } else {
    const formData = await request.formData();
    payload = {
      email: formData.get("email"),
      password: formData.get("password"),
    };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Enter a valid email and password." },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ ok: true, redirectTo: "/" });
  const supabase = createRouteHandlerClient(request, response);
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    const message = error.message.toLowerCase().includes("confirm")
      ? "Confirm your email first, then sign in."
      : "The email or password was not accepted.";
    return NextResponse.json({ ok: false, message }, { status: 401 });
  }

  return response;
}
