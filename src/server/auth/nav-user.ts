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

    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("display_name, username").eq("id", user.id).maybeSingle(),
      supabase.from("profile_roles").select("role, expires_at").eq("profile_id", user.id),
    ]);

    const now = Date.now();
    const canManageCompetitions = (roles ?? []).some(
      ({ role, expires_at }) =>
        (role === "admin" || role === "organizer") &&
        (!expires_at || Date.parse(expires_at) > now),
    );

    return navUserFromParts({
      profileId: user.id,
      displayName: profile?.display_name ?? "",
      username: profile?.username ?? null,
      email: user.email,
      metadataDisplayName: user.user_metadata?.display_name,
      canManageCompetitions,
    });
  } catch {
    return null;
  }
}
