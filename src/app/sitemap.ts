import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/supabase/env";

const routes = [
  "",
  "/league",
  "/tournaments",
  "/standings",
  "/teams",
  "/players",
  "/championship",
  "/supporters",
  "/rules",
  "/hall-of-fame",
  "/legal",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date("2026-09-05T00:00:00.000Z"),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}
