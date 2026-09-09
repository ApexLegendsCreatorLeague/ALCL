import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  RESET_COOKIE_MAX_AGE_SECONDS,
  RESET_COOKIE_NAME,
  signResetDispatchToken,
  validatePasswordResetRequest,
} from "@/server/auth/forgot-password";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  email: z.email().max(254),
  accountName: z.string().trim().min(2).max(50),
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
      accountName: formData.get("accountName"),
    };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Enter the email and account name from your player registration." },
      { status: 400 },
    );
  }

  const result = await validatePasswordResetRequest(parsed.data.email, parsed.data.accountName);
  if (!result.ok) {
    return NextResponse.json(result, { status: 503 });
  }

  const response = NextResponse.json({
    ok: true,
    message:
      "If the email and account name match an ALCL player account, a password reset link is on its way.",
  });

  if (result.authorized) {
    response.cookies.set(RESET_COOKIE_NAME, signResetDispatchToken(result.email), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: RESET_COOKIE_MAX_AGE_SECONDS,
      path: "/api/auth/dispatch-reset",
    });
  }

  return response;
}
