/** Client-safe Supabase env (NEXT_PUBLIC_* only - available in the browser bundle). */

export function publicSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined;
}

export function publicSupabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    undefined
  );
}

export function isPublicSupabaseConfigured() {
  return Boolean(publicSupabaseUrl() && publicSupabaseAnonKey());
}
