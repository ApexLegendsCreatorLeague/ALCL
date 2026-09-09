import { createHash, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const playerSchema = z.object({
  displayName: z.string().trim().max(40),
  platform: z.enum(["PC", "PlayStation", "Xbox", "Nintendo Switch"]),
  role: z.enum(["IGL", "Fragger", "Support", "Flex", "Substitute"]),
  rank: z.enum(["Platinum", "Diamond", "Master", "Predator"]),
});

const schema = z.object({
  teamName: z.string().trim().min(2).max(80),
  abbreviation: z.string().trim().min(2).max(5),
  region: z.enum(["North America", "Europe", "Oceania", "Asia Pacific"]),
  managerEmail: z.string().trim().email().max(254),
  website: z.string().trim().url().or(z.literal("")),
  socialLink: z.string().trim().url().or(z.literal("")),
  players: z.array(playerSchema).length(5),
  eligibilityAccepted: z.literal(true),
  rosterLockAccepted: z.literal(true),
  rulesAccepted: z.literal(true),
}).superRefine((value, context) => {
  if (value.players.slice(0, 3).some((player) => !player.displayName)) {
    context.addIssue({ code: "custom", path: ["players"], message: "Three starters are required." });
  }
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Registration data is incomplete or invalid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (parsed.data.players.filter((player) => player.rank === "Predator").length > 1) {
    return NextResponse.json(
      { message: "This event allows at most one Predator rank snapshot per five-player roster." },
      { status: 422 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { id: randomUUID(), demoMode: true, message: "Validated in local demo mode." },
      { status: 202 },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Sign in to submit a registration." }, { status: 401 });

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id")
    .eq("status", "registration")
    .order("registration_closes_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!tournament) {
    return NextResponse.json({ message: "No tournament is currently accepting registrations." }, { status: 409 });
  }

  const { data: existingTeam } = await supabase
    .from("teams")
    .select("id")
    .eq("captain_id", user.id)
    .ilike("name", parsed.data.teamName)
    .maybeSingle();
  let team = existingTeam;
  if (!team) {
    const baseSlug = parsed.data.teamName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    const created = await supabase
      .from("teams")
      .insert({
        name: parsed.data.teamName,
        short_name: parsed.data.abbreviation.toUpperCase(),
        slug: `${baseSlug}-${randomUUID().slice(0, 6)}`,
        captain_id: user.id,
      })
      .select("id")
      .single();
    if (created.error || !created.data) {
      return NextResponse.json(
        { message: created.error?.message ?? "The team could not be created." },
        { status: 400 },
      );
    }
    team = created.data;
  }

  const { data: existingRoster } = await supabase
    .from("rosters")
    .select("id")
    .eq("team_id", team.id)
    .eq("tournament_id", tournament.id)
    .maybeSingle();
  let roster = existingRoster;
  if (!roster) {
    const created = await supabase
      .from("rosters")
      .insert({
        team_id: team.id,
        tournament_id: tournament.id,
        submitted_by: user.id,
        name: "Registration roster",
      })
      .select("id")
      .single();
    if (created.error || !created.data) {
      return NextResponse.json(
        { message: created.error?.message ?? "The roster could not be created." },
        { status: 400 },
      );
    }
    roster = created.data;
  }

  const { data: registration, error } = await supabase
    .from("registrations")
    .insert({
      tournament_id: tournament.id,
      team_id: team.id,
      roster_id: roster.id,
      submitted_by: user.id,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !registration) {
    return NextResponse.json({ message: error?.message ?? "Registration could not be created." }, { status: 400 });
  }

  const snapshot = {
    ...parsed.data,
    managerEmail: createHash("sha256").update(parsed.data.managerEmail).digest("hex"),
    submittedAt: new Date().toISOString(),
  };
  const contentHash = createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex");
  const { error: snapshotError } = await supabase.from("registration_snapshots").insert({
    registration_id: registration.id,
    version: 1,
    snapshot,
    content_hash: contentHash,
    created_by: user.id,
  });
  if (snapshotError) {
    return NextResponse.json({ message: "Registration created, but its audit snapshot failed." }, { status: 500 });
  }

  return NextResponse.json({ id: registration.id }, { status: 201 });
}
