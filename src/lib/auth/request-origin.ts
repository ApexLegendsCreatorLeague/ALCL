import type { NextRequest } from "next/server";

import { siteUrl } from "@/lib/supabase/env";

export function resolveRequestOrigin(request: NextRequest) {
  const origin = request.headers.get("origin")?.trim();
  if (origin && /^https?:\/\//i.test(origin)) {
    return origin.replace(/\/$/, "");
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? "https";

  if (host) {
    return `${protocol}://${host}`.replace(/\/$/, "");
  }

  return siteUrl();
}
