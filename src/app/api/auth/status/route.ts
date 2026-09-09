import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  return NextResponse.json({
    configured: isSupabaseConfigured(),
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasSiteUrl: Boolean(process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL),
  });
}
