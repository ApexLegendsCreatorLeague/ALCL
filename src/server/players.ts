import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

const regionToCountry: Record<string, string> = {
  "North America": "US",
  Europe: "GB",
  Oceania: "AU",
  "Asia Pacific": "JP",
};

export function regionToCountryCode(region: string) {
  return regionToCountry[region] ?? "US";
}

export function mapPlatform(platform: string) {
  const normalized: Record<string, string> = {
    PC: "pc",
    PlayStation: "playstation",
    Xbox: "xbox",
    "Nintendo Switch": "switch",
  };
  return normalized[platform] ?? "pc";
}

export async function ensurePlayerRecord(
  supabase: SupabaseClient<Database>,
  userId: string,
  options?: { platform?: string; region?: string; countryCode?: string },
) {
  const platform = options?.platform ? mapPlatform(options.platform) : undefined;
  const countryCode =
    options?.countryCode ??
    (options?.region ? regionToCountryCode(options.region) : undefined);

  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (existing) {
    if (platform || countryCode) {
      await supabase
        .from("players")
        .update({
          ...(platform ? { platform } : {}),
          ...(countryCode ? { country_code: countryCode } : {}),
        })
        .eq("profile_id", userId);
    }
    return existing.id;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("country_code")
    .eq("id", userId)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("players")
    .insert({
      profile_id: userId,
      platform: platform ?? "pc",
      country_code: countryCode ?? profile?.country_code ?? "US",
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "The player profile could not be created.");
  }

  return created.id;
}
