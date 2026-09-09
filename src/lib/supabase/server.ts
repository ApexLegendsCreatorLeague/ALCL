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

function bindCookieStore(cookieStore: Awaited<ReturnType<typeof cookies>>, writable: boolean) {
  return {
    getAll: () => cookieStore.getAll(),
    setAll(cookiesToSet: { name: string; value: string; options?: Parameters<typeof cookieStore.set>[2] }[]) {
      if (!writable) {
        return;
      }
      cookiesToSet.forEach(({ name, value, options }) =>
        cookieStore.set(name, value, options),
      );
    },
  };
}

/** Read-only Supabase client for Server Components and layouts. */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = credentials();

  return createServerClient<Database>(url, key, {
    cookies: bindCookieStore(cookieStore, false),
  });
}

/** Writable Supabase client for Server Actions that establish sessions. */
export async function createActionClient() {
  const cookieStore = await cookies();
  const { url, key } = credentials();

  return createServerClient<Database>(url, key, {
    cookies: bindCookieStore(cookieStore, true),
  });
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}
