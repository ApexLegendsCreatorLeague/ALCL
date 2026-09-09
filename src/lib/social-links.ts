export type PlayerSocialPlatform = "youtube" | "x" | "tiktok" | "instagram" | "twitch" | "kick";

export type PlayerSocialField = {
  platform: PlayerSocialPlatform;
  label: string;
  formName: string;
  profileKey: keyof PlayerSocialLinks;
  hint: string;
  cssClass: string;
};

export type PlayerSocialLinks = {
  youtubeUrl: string | null;
  xUrl: string | null;
  tiktokUrl: string | null;
  instagramUrl: string | null;
  twitchUrl: string | null;
  kickUrl: string | null;
};

export const PLAYER_SOCIAL_FIELDS: readonly PlayerSocialField[] = [
  {
    platform: "youtube",
    label: "YouTube",
    formName: "youtubeUrl",
    profileKey: "youtubeUrl",
    hint: "Channel URL or handle, e.g. youtube.com/@yourname",
    cssClass: "profile-social-youtube",
  },
  {
    platform: "x",
    label: "X",
    formName: "xUrl",
    profileKey: "xUrl",
    hint: "Profile URL or handle, e.g. x.com/yourname or @yourname",
    cssClass: "profile-social-x",
  },
  {
    platform: "tiktok",
    label: "TikTok",
    formName: "tiktokUrl",
    profileKey: "tiktokUrl",
    hint: "Profile URL or handle, e.g. tiktok.com/@yourname",
    cssClass: "profile-social-tiktok",
  },
  {
    platform: "instagram",
    label: "Instagram",
    formName: "instagramUrl",
    profileKey: "instagramUrl",
    hint: "Profile URL or handle, e.g. instagram.com/yourname",
    cssClass: "profile-social-instagram",
  },
  {
    platform: "twitch",
    label: "Twitch",
    formName: "twitchUrl",
    profileKey: "twitchUrl",
    hint: "Channel URL or handle, e.g. twitch.tv/yourname",
    cssClass: "profile-social-twitch",
  },
  {
    platform: "kick",
    label: "Kick",
    formName: "kickUrl",
    profileKey: "kickUrl",
    hint: "Channel URL or handle, e.g. kick.com/yourname",
    cssClass: "profile-social-kick",
  },
] as const;

function toHttpsUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/^http:\/\//i, "https://");
  }
  return null;
}

function stripHandle(value: string) {
  return value.trim().replace(/^@/, "");
}

export function normalizeSocialUrl(platform: PlayerSocialPlatform, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const https = toHttpsUrl(trimmed);
  if (https) return https;

  const handle = stripHandle(trimmed);
  if (!handle) return null;

  switch (platform) {
    case "youtube": {
      const channel = handle.replace(/^(www\.)?(youtube\.com\/(c\/|channel\/|@)?)/i, "");
      return channel.startsWith("UC")
        ? `https://youtube.com/channel/${channel}`
        : `https://youtube.com/@${channel.replace(/^@/, "")}`;
    }
    case "x": {
      const user = handle.replace(/^(www\.)?(twitter\.com\/|x\.com\/)/i, "");
      return `https://x.com/${user}`;
    }
    case "tiktok": {
      const user = handle.replace(/^(www\.)?tiktok\.com\/@?/i, "");
      return `https://tiktok.com/@${user}`;
    }
    case "instagram": {
      const user = handle.replace(/^(www\.)?instagram\.com\//i, "");
      return `https://instagram.com/${user}`;
    }
    case "twitch": {
      const user = handle.replace(/^(www\.)?twitch\.tv\//i, "");
      return `https://twitch.tv/${user}`;
    }
    case "kick": {
      const user = handle.replace(/^(www\.)?kick\.com\//i, "");
      return `https://kick.com/${user}`;
    }
  }
}

export function normalizePlayerSocials(input: Partial<Record<keyof PlayerSocialLinks, string>>) {
  return {
    youtubeUrl: normalizeSocialUrl("youtube", input.youtubeUrl ?? ""),
    xUrl: normalizeSocialUrl("x", input.xUrl ?? ""),
    tiktokUrl: normalizeSocialUrl("tiktok", input.tiktokUrl ?? ""),
    instagramUrl: normalizeSocialUrl("instagram", input.instagramUrl ?? ""),
    twitchUrl: normalizeSocialUrl("twitch", input.twitchUrl ?? ""),
    kickUrl: normalizeSocialUrl("kick", input.kickUrl ?? ""),
  };
}

export function socialLabelFromUrl(url: string | null, platform: PlayerSocialPlatform) {
  if (!url) return null;

  const fallback = PLAYER_SOCIAL_FIELDS.find((field) => field.platform === platform)?.label ?? "Link";

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const handle = segments.find((segment) => segment !== "channel" && segment !== "c") ?? segments[0];
    if (!handle) return fallback;
    return handle.startsWith("@") ? handle : `@${handle.replace(/^@/, "")}`;
  } catch {
    return fallback;
  }
}

export function hasAnySocialLinks(links: PlayerSocialLinks) {
  return PLAYER_SOCIAL_FIELDS.some((field) => links[field.profileKey]);
}

// Backward-compatible helpers
export const normalizeTwitchUrl = (value: string) => normalizeSocialUrl("twitch", value);
export const normalizeKickUrl = (value: string) => normalizeSocialUrl("kick", value);
