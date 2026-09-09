import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/supabase/env";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/dashboard/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
