import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { supabaseUrl } from "@/lib/supabase/env";

export function createAdminClient() {
  const url = supabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing server-only Supabase environment variables.");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
