import { NextResponse } from "next/server";

import { supabaseAnonKey, supabaseUrl, siteUrl } from "@/lib/supabase/env";
import { isSupabaseConfigured } from "@/lib/supabase/server";

function hasValue(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export async function GET() {
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();

  return NextResponse.json({
    configured: isSupabaseConfigured(),
    hasSupabaseUrl: hasValue(url),
    hasAnonKey: hasValue(anonKey),
    hasServiceRole: hasValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasSiteUrl: hasValue(siteUrl("")),
    envKeysPresent: {
      SUPABASE_URL: hasValue(process.env.SUPABASE_URL),
      SUPABASE_ANON_KEY: hasValue(process.env.SUPABASE_ANON_KEY),
      NEXT_PUBLIC_SUPABASE_URL: hasValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: hasValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: hasValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
      SITE_URL: hasValue(process.env.SITE_URL),
    },
    hint: !hasValue(url) || !hasValue(anonKey)
      ? "Add SUPABASE_URL and SUPABASE_ANON_KEY in Vercel → Settings → Environment Variables → Production, then redeploy."
      : !hasValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
        ? "Add SUPABASE_SERVICE_ROLE_KEY for registration to work."
        : "Auth env looks configured.",
  });
}
