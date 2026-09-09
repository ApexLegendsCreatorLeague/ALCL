import { NextResponse } from "next/server";

import {
  envDiagnostics,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
  siteUrl,
} from "@/lib/supabase/env";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function hasValue(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export async function GET() {
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  const serviceRole = supabaseServiceRoleKey();
  const vercelEnv = process.env.VERCEL_ENV ?? "unknown";

  let hint = "Auth env looks configured.";
  if (!hasValue(url) || !hasValue(anonKey)) {
    hint =
      vercelEnv === "preview"
        ? "Vars may be set for Production only. Edit each env var → Environments → check Production AND Preview, save, redeploy."
        : "Add Supabase vars for this Vercel environment, then redeploy. Vercel integration uses SUPABASE_PUBLISHABLE_KEY / SUPABASE_SECRET_KEY (not ANON_KEY).";
  } else if (!hasValue(serviceRole)) {
    hint = "Add SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY for registration.";
  }

  return NextResponse.json({
    configured: isSupabaseConfigured(),
    hasSupabaseUrl: hasValue(url),
    hasAnonKey: hasValue(anonKey),
    hasServiceRole: hasValue(serviceRole),
    hasSiteUrl: hasValue(siteUrl("")),
    vercelEnv,
    envKeysPresent: envDiagnostics(),
    hint,
  });
}
