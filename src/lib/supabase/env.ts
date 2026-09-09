function readEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** Server-safe env reads. Supports manual Vercel vars and Supabase integration sync names. */
export function supabaseUrl() {
  return readEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
}

export function supabaseAnonKey() {
  return readEnv(
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
}

export function supabaseServiceRoleKey() {
  return readEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
  );
}

export function siteUrl(fallback = "http://localhost:3000") {
  const configured = readEnv("SITE_URL", "NEXT_PUBLIC_SITE_URL", "VERCEL_PROJECT_PRODUCTION_URL");
  const base = configured || fallback;
  return base.replace(/\/$/, "");
}

export function envDiagnostics() {
  const keys = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SITE_URL",
  ] as const;

  return Object.fromEntries(
    keys.map((key) => [key, Boolean(process.env[key]?.trim())]),
  ) as Record<(typeof keys)[number], boolean>;
}
