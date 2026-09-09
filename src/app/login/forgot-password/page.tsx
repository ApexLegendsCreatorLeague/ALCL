import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { safeNextPath } from "@/lib/auth/redirect-path";
import { getNavUser } from "@/server/auth/nav-user";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your ALCL player account password.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getNavUser();
  if (user) {
    redirect(safeNextPath(undefined, "/dashboard"));
  }

  const { error } = await searchParams;
  const expiredMessage =
    error === "reset_expired"
      ? "That reset link expired or was already used. Request a new one below."
      : null;

  return (
    <AppShell>
      <div className="container" style={{ display: "grid", placeItems: "center", minHeight: "65vh" }}>
        <div className="card" style={{ width: "min(440px, 100%)" }}>
          <div className="eyebrow">Password reset</div>
          <h3 style={{ fontSize: 30 }}>Forgot your password?</h3>
          <p className="legal" style={{ marginBottom: "1rem" }}>
            Enter the email and account name from your player registration. We will email you a link
            to choose a new password.
          </p>
          {expiredMessage ? (
            <p role="alert" className="legal">
              {expiredMessage}
            </p>
          ) : null}
          <ForgotPasswordForm />
          <p className="legal">
            <Link href="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
