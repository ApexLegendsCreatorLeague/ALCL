import { NextResponse, type NextRequest } from "next/server";

import { resolveRequestOrigin } from "@/lib/auth/request-origin";
import {
  RESET_COOKIE_NAME,
  dispatchPasswordResetEmail,
  readResetDispatchEmail,
} from "@/server/auth/forgot-password";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(RESET_COOKIE_NAME)?.value;
  const email = readResetDispatchEmail(token);

  const response = NextResponse.json({
    ok: true,
    sent: false,
    message:
      "If the email and account name match an ALCL player account, a password reset link is on its way.",
  });

  response.cookies.set(RESET_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/api/auth/dispatch-reset",
  });

  if (!email) {
    return response;
  }

  const result = await dispatchPasswordResetEmail(email, resolveRequestOrigin(request));
  if (!result.ok) {
    return NextResponse.json(result, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    sent: true,
    message:
      "If the email and account name match an ALCL player account, a password reset link is on its way.",
  });
}
