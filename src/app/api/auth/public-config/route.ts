import { NextResponse } from "next/server";

import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Exposes public Supabase client config when NEXT_PUBLIC_* vars are missing on Vercel. */
export async function GET() {
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();

  if (!url || !anonKey) {
    return NextResponse.json({ configured: false }, { status: 503 });
  }

  return NextResponse.json(
    { configured: true, url, anonKey },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
