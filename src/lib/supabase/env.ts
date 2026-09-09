/** Server-safe env reads. Prefer non-public names on Vercel (Secrets). */
export function supabaseUrl() {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function supabaseAnonKey() {
  return (
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function siteUrl(fallback = "http://localhost:3000") {
  const configured = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const base = configured || fallback;
  return base.replace(/\/$/, "");
}
