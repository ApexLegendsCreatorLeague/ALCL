import "server-only";

import { navUserFromParts } from "@/lib/auth/nav-user-map";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { NavUser } from "@/types/nav";

export async function getNavUser(): Promise<NavUser | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", user.id)
      .maybeSingle();

    return navUserFromParts({
      profileId: user.id,
      displayName: profile?.display_name ?? "",
      username: profile?.username ?? null,
      email: user.email,
      metadataDisplayName: user.user_metadata?.display_name,
    });
  } catch {
    return null;
  }
}
