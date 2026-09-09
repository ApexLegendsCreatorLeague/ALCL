import type { Metadata } from "next";
import Link from "next/link";

import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { AuthConfigBanner } from "@/components/auth-config-banner";
import { PlayerRegisterForm } from "@/components/player-register-form";
import { DEFAULT_PLAYER_HOME } from "@/lib/auth/redirect-path";
import { getNavUser } from "@/server/auth/nav-user";

export const metadata: Metadata = {
  title: "Player registration",
  description: "Create your ALCL player account. Teams do not have separate logins.",
};

export default async function RegisterPlayerPage() {
  const user = await getNavUser();
  if (user) {
    redirect(DEFAULT_PLAYER_HOME);
  }

  return (
    <AppShell>
      <div className="container" style={{ display: "grid", placeItems: "center", minHeight: "65vh" }}>
        <div className="card" style={{ width: "min(440px, 100%)" }}>
          <div className="eyebrow">Player registration</div>
          <h3 style={{ fontSize: 30 }}>Create your player account</h3>
          <p className="legal" style={{ marginBottom: "1rem" }}>
            Every person who competes gets their own player login. Teams are just groups of those
            players — captains create teams after everyone has signed up.
          </p>
          <AuthConfigBanner />
          <PlayerRegisterForm />
          <p className="legal">
            Already have a player account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
