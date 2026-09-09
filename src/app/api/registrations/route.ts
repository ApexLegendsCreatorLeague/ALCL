import { createHash, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ensurePlayerRecord } from "@/server/players";
import { assignTeamManager } from "@/server/teams";
import type { Database } from "@/types/database";

const rosterSlotSchema = z.object({
  playerId: z.uuid().nullable(),
  role: z.enum(["IGL", "Fragger", "Support", "Flex", "Substitute"]),
  rank: z.enum(["Platinum", "Diamond", "Master", "Predator"]),
  isSubstitute: z.boolean(),
});

const schema = z.object({
  teamName: z.string().trim().min(2).max(80),
  abbreviation: z.string().trim().min(2).max(5),
  region: z.enum(["North America", "Europe", "Oceania", "Asia Pacific"]),
  website: z.string().trim().url().or(z.literal("")),
  socialLink: z.string().trim().url().or(z.literal("")),
  roster: z.array(rosterSlotSchema).length(5),
  eligibilityAccepted: z.literal(true),
  rosterLockAccepted: z.literal(true),
  rulesAccepted: z.literal(true),
});

type RegistrationPayload = z.infer<typeof schema>;
type DbClient = SupabaseClient<Database>;

async function bootstrapOrganizerIfNeeded(supabase: DbClient, userId: string) {
  const { count } = await supabase
    .from("profile_roles")
    .select("*", { count: "exact", head: true })
    .in("role", ["admin", "organizer"]);
  if ((count ?? 0) > 0) return;

  try {
    const admin = createAdminClient();
    await admin.from("profile_roles").upsert(
      [
        { profile_id: userId, role: "organizer", granted_by: userId },
        { profile_id: userId, role: "admin", granted_by: userId },
      ],
      { onConflict: "profile_id,role", ignoreDuplicates: true },
    );
  } catch {
    // Service role missing; first-user bootstrap may require manual role assignment.
  }
}

async function userCanManageCompetitions(supabase: DbClient, userId: string) {
  const { data } = await supabase
    .from("profile_roles")
    .select("role, expires_at")
    .eq("profile_id", userId)
    .in("role", ["admin", "organizer"]);
  const now = Date.now();
  return (data ?? []).some(
    ({ expires_at }) => !expires_at || Date.parse(expires_at) > now,
  );
}

async function ensureTeam(
  supabase: DbClient,
  userId: string,
  payload: RegistrationPayload,
) {
  const { data: existingTeam } = await supabase
    .from("teams")
    .select("id")
    .eq("captain_id", userId)
    .ilike("name", payload.teamName)
    .maybeSingle();
  if (existingTeam) return existingTeam;

  const baseSlug = payload.teamName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const { data, error } = await supabase
    .from("teams")
    .insert({
      name: payload.teamName,
      short_name: payload.abbreviation.toUpperCase(),
      slug: `${baseSlug}-${randomUUID().slice(0, 6)}`,
      captain_id: userId,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "The team could not be created.");
  }
  return data;
}

async function ensureTeamMember(
  supabase: DbClient,
  teamId: string,
  playerId: string,
  isManagerOnRoster: boolean,
) {
  const { data: activeMembership } = await supabase
    .from("team_players")
    .select("team_id")
    .eq("player_id", playerId)
    .is("left_at", null)
    .maybeSingle();

  if (activeMembership && activeMembership.team_id !== teamId) {
    throw new Error("One or more selected players are already on another team.");
  }

  const { data: existing } = await supabase
    .from("team_players")
    .select("player_id")
    .eq("team_id", teamId)
    .eq("player_id", playerId)
    .is("left_at", null)
    .maybeSingle();
  if (existing) return;

  const { error } = await supabase.from("team_players").insert({
    team_id: teamId,
    player_id: playerId,
    is_captain: isManagerOnRoster,
  });
  if (error) {
    throw new Error(error.message ?? "A roster player could not be linked to the team.");
  }
}

async function syncRosterMembers(
  supabase: DbClient,
  teamId: string,
  rosterId: string,
  managerPlayerId: string,
  roster: RegistrationPayload["roster"],
) {
  const activeSlots = roster
    .map((slot, index) => ({ ...slot, slot: index + 1 }))
    .filter((slot) => slot.playerId);

  for (const slot of activeSlots) {
    const playerId = slot.playerId!;
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id")
      .eq("id", playerId)
      .maybeSingle();
    if (playerError || !player) {
      throw new Error("Every roster slot must reference a registered ALCL player account.");
    }

    await supabase
      .from("players")
      .update({
        rank: slot.rank,
        rank_captured_at: new Date().toISOString(),
      })
      .eq("id", playerId);

    await ensureTeamMember(supabase, teamId, playerId, playerId === managerPlayerId);

    const { error: rosterPlayerError } = await supabase.from("roster_players").upsert(
      {
        roster_id: rosterId,
        player_id: playerId,
        slot: slot.slot,
        is_substitute: slot.isSubstitute,
      },
      { onConflict: "roster_id,slot" },
    );
    if (rosterPlayerError) {
      throw new Error(rosterPlayerError.message ?? "The tournament roster could not be saved.");
    }
  }
}

function validateRoster(roster: RegistrationPayload["roster"]) {
  const starters = roster.slice(0, 3);
  if (starters.some((slot) => !slot.playerId)) {
    return "Three starters must be registered ALCL player accounts.";
  }

  const playerIds = roster.map((slot) => slot.playerId).filter(Boolean) as string[];
  if (new Set(playerIds).size !== playerIds.length) {
    return "Each roster slot must use a different registered player.";
  }

  if (roster.filter((slot) => slot.playerId && slot.rank === "Predator").length > 1) {
    return "This event allows at most one Predator rank snapshot per roster.";
  }

  return null;
}

function buildSnapshot(payload: RegistrationPayload, managerProfileId: string) {
  return {
    ...payload,
    managerProfileId,
    submittedAt: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Registration data is incomplete or invalid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { message: "Sign in and register player accounts before creating a team." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ message: "Sign in to create a team." }, { status: 401 });
  }

  let managerPlayerId: string;
  try {
    managerPlayerId = await ensurePlayerRecord(supabase, user.id);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Create your player account first." },
      { status: 400 },
    );
  }

  const rosterError = validateRoster(parsed.data.roster);
  if (rosterError) {
    return NextResponse.json({ message: rosterError }, { status: 422 });
  }

  await bootstrapOrganizerIfNeeded(supabase, user.id);
  const isOrganizer = await userCanManageCompetitions(supabase, user.id);
  const { count: teamCountBefore } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true });
  const canCreateTeamDirectly = isOrganizer || (teamCountBefore ?? 0) === 0;

  let team: { id: string };
  try {
    team = await ensureTeam(supabase, user.id, parsed.data);
    await assignTeamManager(supabase, user.id);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "The team could not be created." },
      { status: 400 },
    );
  }

  const { data: openTournament } = await supabase
    .from("tournaments")
    .select("id")
    .eq("status", "registration")
    .order("registration_closes_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let rosterId: string | null = null;

  if (openTournament) {
    const { data: existingRoster } = await supabase
      .from("rosters")
      .select("id")
      .eq("team_id", team.id)
      .eq("tournament_id", openTournament.id)
      .maybeSingle();

    if (existingRoster) {
      rosterId = existingRoster.id;
    } else {
      const created = await supabase
        .from("rosters")
        .insert({
          team_id: team.id,
          tournament_id: openTournament.id,
          submitted_by: user.id,
          name: "Registration roster",
        })
        .select("id")
        .single();
      if (created.error || !created.data) {
        if (!canCreateTeamDirectly) {
          return NextResponse.json(
            { message: created.error?.message ?? "The roster could not be created." },
            { status: 400 },
          );
        }
      } else {
        rosterId = created.data.id;
      }
    }
  }

  try {
    if (rosterId) {
      await syncRosterMembers(supabase, team.id, rosterId, managerPlayerId, parsed.data.roster);
    } else {
      for (const slot of parsed.data.roster.filter((entry) => entry.playerId)) {
        await ensureTeamMember(
          supabase,
          team.id,
          slot.playerId!,
          slot.playerId === managerPlayerId,
        );
        await supabase
          .from("players")
          .update({
            rank: slot.rank,
            rank_captured_at: new Date().toISOString(),
          })
          .eq("id", slot.playerId!);
      }
    }
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "The roster could not be linked to player accounts." },
      { status: 422 },
    );
  }

  if (!openTournament || !rosterId) {
    return NextResponse.json(
      {
        id: team.id,
        teamId: team.id,
        status: "approved",
        teamOnly: true,
        message: "Team created. You are the team manager.",
      },
      { status: 201 },
    );
  }

  const { data: registration, error } = await supabase
    .from("registrations")
    .insert({
      tournament_id: openTournament.id,
      team_id: team.id,
      roster_id: rosterId,
      submitted_by: user.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !registration) {
    if (canCreateTeamDirectly) {
      return NextResponse.json(
        {
          id: team.id,
          teamId: team.id,
          status: "approved",
          teamOnly: true,
          message:
            error?.message ??
            "Team and roster created. Tournament registration opens after event rules are published.",
        },
        { status: 201 },
      );
    }
    return NextResponse.json(
      { message: error?.message ?? "Registration could not be created." },
      { status: 400 },
    );
  }

  const snapshot = buildSnapshot(parsed.data, user.id);
  const contentHash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
  const { error: snapshotError } = await supabase.from("registration_snapshots").insert({
    registration_id: registration.id,
    version: 1,
    snapshot,
    content_hash: contentHash,
    created_by: user.id,
  });
  if (snapshotError) {
    return NextResponse.json(
      { message: "Registration created, but its audit snapshot failed." },
      { status: 500 },
    );
  }

  let status: "approved" | "pending" = "pending";
  if (isOrganizer) {
    const reviewedAt = new Date().toISOString();
    const { error: approveError } = await supabase
      .from("registrations")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: reviewedAt,
      })
      .eq("id", registration.id);
    if (!approveError) status = "approved";
  }

  return NextResponse.json(
    {
      id: registration.id,
      teamId: team.id,
      status,
      message: status === "approved" ? "Team created. You are the team manager." : "Registration submitted for review.",
    },
    { status: 201 },
  );
}
