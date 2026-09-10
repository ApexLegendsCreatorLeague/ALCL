"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { APEX_LEGENDS, normalizeTopLegends } from "@/lib/apex-legends";
import { normalizePlayerSocials } from "@/lib/social-links";
import { createActionClient } from "@/lib/supabase/server";
import { actionFailure, actionSuccess, type ActionResult } from "@/server/action-result";
import { requireUser } from "@/server/auth";

const optionalUrl = z.string().max(200).optional();
const legendName = z
  .string()
  .trim()
  .refine((value) => !value || (APEX_LEGENDS as readonly string[]).includes(value), {
    message: "Pick a valid legend.",
  });

const profileSchema = z.object({
  playerId: z.string().uuid(),
  bio: z.string().max(500).optional(),
  username: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_]{3,30}$/, "Username must be 3–30 characters (letters, numbers, underscore).")
    .or(z.literal("")),
  youtubeUrl: optionalUrl,
  xUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  instagramUrl: optionalUrl,
  twitchUrl: optionalUrl,
  kickUrl: optionalUrl,
  lookingForTeam: z.enum(["true", "false"]).optional(),
  mainLegend1: legendName.optional(),
  mainLegend2: legendName.optional(),
  mainLegend3: legendName.optional(),
  availability: z.string().max(250).optional(),
  recruitmentPitch: z.string().max(800).optional(),
});

export async function updatePlayerProfile(
  _previous: ActionResult<{ playerId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ playerId: string }>> {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return actionFailure("UNAUTHENTICATED", "Sign in to edit your profile.");
  }

  const parsed = profileSchema.safeParse({
    playerId: formData.get("playerId"),
    bio: formData.get("bio") ?? "",
    username: formData.get("username") ?? "",
    youtubeUrl: formData.get("youtubeUrl") ?? "",
    xUrl: formData.get("xUrl") ?? "",
    tiktokUrl: formData.get("tiktokUrl") ?? "",
    instagramUrl: formData.get("instagramUrl") ?? "",
    twitchUrl: formData.get("twitchUrl") ?? "",
    kickUrl: formData.get("kickUrl") ?? "",
    lookingForTeam: formData.get("lookingForTeam") === "true" ? "true" : "false",
    mainLegend1: formData.get("mainLegend1") ?? "",
    mainLegend2: formData.get("mainLegend2") ?? "",
    mainLegend3: formData.get("mainLegend3") ?? "",
    availability: formData.get("availability") ?? "",
    recruitmentPitch: formData.get("recruitmentPitch") ?? "",
  });

  if (!parsed.success) {
    return actionFailure("INVALID_INPUT", "Fix the highlighted fields and try again.", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const supabase = await createActionClient();
  const { data: player } = await supabase
    .from("players")
    .select("id, profile_id")
    .eq("id", parsed.data.playerId)
    .maybeSingle();

  if (!player || player.profile_id !== user.id) {
    return actionFailure("FORBIDDEN", "You can only edit your own profile.");
  }

  const socials = normalizePlayerSocials(parsed.data);
  const legendInputs: [string, string, string] = [
    parsed.data.mainLegend1?.trim() ?? "",
    parsed.data.mainLegend2?.trim() ?? "",
    parsed.data.mainLegend3?.trim() ?? "",
  ];
  const chosenLegends = legendInputs.filter(Boolean);
  if (new Set(chosenLegends).size !== chosenLegends.length) {
    return actionFailure("INVALID_INPUT", "Pick three different legends.", {
      fieldErrors: { mainLegend2: ["Each top legend must be unique."] },
    });
  }

  const topLegends = normalizeTopLegends(legendInputs);

  const { error } = await supabase
    .from("profiles")
    .update({
      bio: parsed.data.bio?.trim() ? parsed.data.bio.trim() : null,
      username: parsed.data.username?.trim() ? parsed.data.username.trim() : null,
      youtube_url: socials.youtubeUrl,
      x_url: socials.xUrl,
      tiktok_url: socials.tiktokUrl,
      instagram_url: socials.instagramUrl,
      twitch_url: socials.twitchUrl,
      kick_url: socials.kickUrl,
      looking_for_team: parsed.data.lookingForTeam === "true",
      main_legend_1: topLegends[0],
      main_legend_2: topLegends[1],
      main_legend_3: topLegends[2],
      availability: parsed.data.availability?.trim() ? parsed.data.availability.trim() : null,
      recruitment_pitch: parsed.data.recruitmentPitch?.trim()
        ? parsed.data.recruitmentPitch.trim()
        : null,
    })
    .eq("id", user.id);

  if (error) {
    const missingColumn = /column .* does not exist|could not find the .* column/i.test(
      error.message,
    );
    const message = error.message.includes("profiles_username_key")
      ? "That username is already taken."
      : missingColumn
        ? "Profile save needs a Supabase update. Run supabase/scripts/add-profile-fields-all.sql in the SQL Editor."
        : error.message.includes("_url") || error.message.includes("main_legend")
          ? "Enter valid profile details."
          : "Your profile could not be saved.";
    return actionFailure("CONFLICT", message);
  }

  revalidatePath(`/players/${player.id}`);
  revalidatePath(`/players/${player.id}/edit`);
  revalidatePath("/players");

  return actionSuccess({ playerId: player.id });
}

export async function savePlayerProfileAndRedirect(
  previous: ActionResult<{ playerId: string }> | null,
  formData: FormData,
) {
  const result = await updatePlayerProfile(previous, formData);
  if (result.ok) {
    redirect(`/players/${result.data.playerId}?status=profile_saved`);
  }
  return result;
}
