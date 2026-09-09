import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { siteUrl } from "@/lib/supabase/env";
import { registerPlayer } from "@/server/auth/register-player";

const schema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(2).max(50),
  platform: z.enum(["PC", "PlayStation", "Xbox", "Nintendo Switch"]).default("PC"),
  region: z.enum(["North America", "Europe", "Oceania", "Asia Pacific"]).default("North America"),
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
    };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Enter a valid email, display name, platform, region, and password (8+ characters)." },
      { status: 400 },
    );
  }

  const redirectBase = siteUrl(request.nextUrl.origin);
  const result = await registerPlayer({
    ...parsed.data,
    redirectBase,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json(result);
}
