import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { AuthForm } from "@/components/auth-form";
import { safeNextPath } from "@/lib/auth/redirect-path";
import { getNavUser } from "@/server/auth/nav-user";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Players sign in to ALCL. Teams do not have login credentials.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getNavUser();
  const { next } = await searchParams;
  if (user) {
    redirect(safeNextPath(next, "/dashboard"));
  }

  return (
    <AppShell>
      <div className="container" style={{ display: "grid", placeItems: "center", minHeight: "65vh" }}>
        <div className="card" style={{ width: "min(440px, 100%)" }}>
          <div className="eyebrow">Sign In</div>
          <h3 style={{ fontSize: 30 }}>Sign In as a Player</h3>
          <p className="legal" style={{ marginBottom: "1rem" }}>
            Only players have ALCL accounts. Teams are groups of players — they never sign in.
          </p>
          <Suspense fallback={<p className="legal">Loading Sign In…</p>}>
            <AuthForm />
          </Suspense>
          <p className="legal">
            <Link href="/forgot-password">Forgot Password?</Link>
          </p>
          <p className="legal">
            No account yet? <Link href="/register">Create a Player Account</Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
