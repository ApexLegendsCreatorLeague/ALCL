import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your ALCL player account.",
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login/forgot-password?error=reset_expired");
  }

  return (
    <AppShell>
      <div className="container" style={{ display: "grid", placeItems: "center", minHeight: "65vh" }}>
        <div className="card" style={{ width: "min(440px, 100%)" }}>
          <div className="eyebrow">Password reset</div>
          <h3 style={{ fontSize: 30 }}>Choose a new password</h3>
          <p className="legal" style={{ marginBottom: "1rem" }}>
            Signed in as <strong>{user.email}</strong>. Pick a new ALCL password below.
          </p>
          <ResetPasswordForm />
          <p className="legal">
            <Link href="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
