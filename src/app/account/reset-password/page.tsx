import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ResetPasswordGate } from "@/components/reset-password-gate";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your ALCL player account.",
};

export default function ResetPasswordPage() {
  return (
    <AppShell>
      <div className="container" style={{ display: "grid", placeItems: "center", minHeight: "65vh" }}>
        <div className="card" style={{ width: "min(440px, 100%)" }}>
          <div className="eyebrow">Password reset</div>
          <h3 style={{ fontSize: 30 }}>Choose a new password</h3>
          <ResetPasswordGate />
          <p className="legal">
            <Link href="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
