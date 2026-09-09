"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { isPublicSupabaseConfigured, publicSupabaseAnonKey, publicSupabaseUrl } from "@/lib/supabase/public-env";

let cachedClient: SupabaseClient<Database> | null | undefined;

export function createBrowserSupabase() {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  if (!isPublicSupabaseConfigured()) {
    cachedClient = null;
    return null;
  }

  cachedClient = createBrowserClient<Database>(publicSupabaseUrl()!, publicSupabaseAnonKey()!);
  return cachedClient;
}

export async function createBrowserSupabaseAsync() {
  const existing = createBrowserSupabase();
  if (existing) {
    return existing;
  }

  if (cachedClient === null && isPublicSupabaseConfigured()) {
    return null;
  }

  try {
    const response = await fetch("/api/auth/public-config", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) {
      cachedClient = null;
      return null;
    }

    const payload = (await response.json()) as {
      configured: boolean;
      url?: string;
      anonKey?: string;
    };

    if (!payload.configured || !payload.url || !payload.anonKey) {
      cachedClient = null;
      return null;
    }

    cachedClient = createBrowserClient<Database>(payload.url, payload.anonKey);
    return cachedClient;
  } catch {
    cachedClient = null;
    return null;
  }
}
