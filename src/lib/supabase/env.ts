function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** Server-safe env reads. Prefer non-public names on Vercel (Secrets). */
export function supabaseUrl() {
  return readEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
}

export function supabaseAnonKey() {
  return readEnv(
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export function supabaseServiceRoleKey() {
  return readEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function siteUrl(fallback = "http://localhost:3000") {
  const configured = readEnv("SITE_URL", "NEXT_PUBLIC_SITE_URL");
  const base = configured || fallback;
  return base.replace(/\/$/, "");
}
