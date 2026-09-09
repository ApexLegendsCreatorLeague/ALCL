import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

function credentials() {
  const url = supabaseUrl();
  const key = supabaseAnonKey();

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY (see .env.example).",
    );
  }

  return { url, key };
}

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = credentials();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies. The proxy refreshes sessions.
        }
      },
    },
  });
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}
