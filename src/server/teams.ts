import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type DbClient = SupabaseClient<Database>;

/** Teams.captain_id stores the team manager's profile id (legacy column name). */
export async function assignTeamManager(
  supabase: DbClient,
  managerProfileId: string,
  grantedBy?: string,
) {
  const { error } = await supabase.from("profile_roles").upsert(
    {
      profile_id: managerProfileId,
      role: "team_manager",
      granted_by: grantedBy ?? managerProfileId,
    },
    { onConflict: "profile_id,role", ignoreDuplicates: true },
  );
  if (error) {
    throw new Error(error.message ?? "The team manager role could not be assigned.");
  }
}

export async function userManagesTeam(supabase: DbClient, teamId: string, profileId: string) {
  const { data } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("captain_id", profileId)
    .maybeSingle();
  return Boolean(data);
}
