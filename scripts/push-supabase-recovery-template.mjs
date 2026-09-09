#!/usr/bin/env node
/**
 * One-time setup: push the ALCL recovery email template to hosted Supabase.
 *
 * Requires a personal access token from https://supabase.com/dashboard/account/tokens
 *
 *   set SUPABASE_ACCESS_TOKEN=your-token
 *   npm run supabase:push-recovery-template
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() || "dfplohhclsnhkwaaujxh";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const siteUrl =
  process.env.SITE_URL?.trim() || "https://thessiatournamentsite.com";

if (!accessToken) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens",
  );
  process.exit(1);
}

const templatePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "supabase",
  "templates",
  "recovery.html",
);
const recoveryContent = readFileSync(templatePath, "utf8");

const redirectUrls = [
  siteUrl,
  `${siteUrl}/auth/callback`,
  `${siteUrl}/auth/recovery`,
  `${siteUrl}/auth/confirm`,
  `${siteUrl}/account/reset-password`,
].join(",");

const payload = {
  site_url: siteUrl,
  uri_allow_list: redirectUrls,
  mailer_subjects_recovery: "Reset your ALCL password",
  mailer_templates_recovery_content: recoveryContent,
};

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  },
);

if (!response.ok) {
  const body = await response.text();
  console.error(`Supabase auth config update failed (${response.status}):`, body);
  process.exit(1);
}

console.log("Supabase auth config updated:");
console.log(`  project: ${projectRef}`);
console.log(`  site_url: ${siteUrl}`);
console.log("  recovery template: token_hash -> /auth/recovery");
console.log("  redirect URLs:", redirectUrls.split(",").join("\n    "));
