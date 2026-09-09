import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AppShell } from "@/components/alcl";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Player sign in",
  description: "Players sign in to ALCL. Teams do not have login credentials.",
};

export default function LoginPage() {
  return (
    <AppShell>
      <div className="container" style={{ display: "grid", placeItems: "center", minHeight: "65vh" }}>
        <div className="card" style={{ width: "min(440px, 100%)" }}>
          <div className="eyebrow">Player sign in</div>
          <h3 style={{ fontSize: 30 }}>Sign in as a player</h3>
          <p className="legal" style={{ marginBottom: "1rem" }}>
            Only players have ALCL accounts. Teams are groups of players — they never sign in.
          </p>
          <Suspense fallback={<p className="legal">Loading sign in…</p>}>
            <AuthForm />
          </Suspense>
          <p className="legal">
            No account yet? <Link href="/register">Create a player account</Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
