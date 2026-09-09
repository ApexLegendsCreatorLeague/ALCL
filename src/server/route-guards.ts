import "server-only";

import { redirect } from "next/navigation";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const managerRoles = ["admin", "organizer"] as const;

async function hasManagerAccess(profileId: string) {
  const supabase = await createClient();
  const { data: roles, error } = await supabase
    .from("profile_roles")
    .select("role, expires_at")
    .eq("profile_id", profileId)
    .in("role", [...managerRoles]);

  if (error) redirect("/login?error=auth_required");

  const now = Date.now();
  return (roles ?? []).some(
    ({ expires_at }) => !expires_at || Date.parse(expires_at) > now,
  );
}

export async function requireDashboardAccess(nextPath = "/dashboard") {
  if (!isSupabaseConfigured()) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}&error=auth_required`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
}

export async function requireAdminAccess(nextPath = "/admin") {
  if (!isSupabaseConfigured()) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}&error=auth_required`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

  const allowed = await hasManagerAccess(user.id);
  if (!allowed) redirect("/dashboard?error=forbidden");
}
