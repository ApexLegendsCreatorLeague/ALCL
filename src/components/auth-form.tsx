"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState, type FormEvent } from "react";

import { readAuthReturnFailure, redirectAuthReturnFailure } from "@/lib/auth/complete-auth-return";
import { DEFAULT_PLAYER_HOME, safeNextPath } from "@/lib/auth/redirect-path";
import { sendMagicLink } from "@/server/actions/auth";

export function AuthForm() {
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"), DEFAULT_PLAYER_HOME);
  const callbackError = searchParams.get("error");

  useEffect(() => {
    const failure = readAuthReturnFailure();
    if (!failure) {
      return;
    }

    redirectAuthReturnFailure(failure);
  }, []);

  const [passwordError, setPasswordError] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [magicState, magicAction, magicPending] = useActionState(sendMagicLink, null);

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      formData.set("next", nextPath);
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const result = (await response.json()) as { ok: boolean; message?: string; redirectTo?: string };

      if (!response.ok || !result.ok) {
        setPasswordError(result.message ?? "Sign in failed.");
        return;
      }

      window.location.assign(result.redirectTo ?? nextPath);
    } catch {
      setPasswordError("Sign in could not reach the server. Try again.");
    } finally {
      setPasswordPending(false);
    }
  }

  const resetSuccess = searchParams.get("reset") === "success";

  const callbackMessage =
    resetSuccess
      ? "Password updated. Sign in with your new password."
      : callbackError === "auth_required"
        ? "Sign in to continue."
        : callbackError === "auth_callback"
          ? "The sign-in link expired or was invalid. Try again."
          : callbackError === "reset_expired"
            ? "That password reset link expired or was already used. Request a new one from Forgot password."
            : null;

  return (
    <div className="form">
      {callbackMessage ? (
        <p role="alert" className="legal">
          {callbackMessage}
        </p>
      ) : null}

      <form onSubmit={handlePasswordSignIn} className="form">
        <label className="field">
          Player Email
          <input className="input" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="field">
          <span className="field-label-row">
            <span>Password</span>
            <Link className="auth-forgot-link" href="/forgot-password">
              Forgot Password?
            </Link>
          </span>
          <input
            className="input"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={8}
            required
          />
        </label>
        {passwordError ? (
          <p role="alert" className="legal">{passwordError}</p>
        ) : null}
        <button className="btn btn-primary" disabled={passwordPending} type="submit">
          {passwordPending ? "Signing In…" : "Sign In"}
        </button>
      </form>

      <div aria-hidden="true" className="legal" style={{ margin: "1.25rem 0" }}>
        Or Use a Magic Link
      </div>

      <form action={magicAction} className="form">
        <input type="hidden" name="next" value={nextPath} />
        <label className="field">
          Player Email for Magic Link
          <input className="input" name="email" type="email" autoComplete="email" required />
        </label>
        {magicState ? (
          <p role="status" className="legal">
            {magicState.ok ? "Check your email for the secure ALCL sign-in link." : magicState.message}
          </p>
        ) : null}
        <button className="btn" disabled={magicPending} type="submit">
          {magicPending ? "Sending…" : "Email Magic Link"}
        </button>
      </form>

      <p className="legal">
        Need an account? <Link href="/register">Create a Player Account</Link>. Teams are built
        after players sign in - teams do not log in.
      </p>
      <p className="legal">
        ALCL will never request an EA password, authentication token, or private game-account access.
      </p>
    </div>
  );
}
