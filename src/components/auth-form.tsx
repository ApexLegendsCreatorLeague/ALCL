"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useState, type FormEvent } from "react";

import { sendMagicLink } from "@/server/actions/auth";

function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const callbackError = searchParams.get("error");

  const [passwordError, setPasswordError] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [magicState, magicAction, magicPending] = useActionState(sendMagicLink, null);

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { ok: boolean; message?: string; redirectTo?: string };

      if (!response.ok || !result.ok) {
        setPasswordError(result.message ?? "Sign in failed.");
        return;
      }

      router.push(result.redirectTo ?? nextPath);
      router.refresh();
    } catch {
      setPasswordError("Sign in could not reach the server. Try again.");
    } finally {
      setPasswordPending(false);
    }
  }

  const callbackMessage =
    callbackError === "auth_required"
      ? "Sign in to continue."
      : callbackError === "auth_callback"
        ? "The sign-in link expired or was invalid. Try again."
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
          Player email
          <input className="input" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="field">
          Password
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
          {passwordPending ? "Signing in…" : "Player sign in"}
        </button>
      </form>

      <div aria-hidden="true" className="legal" style={{ margin: "1.25rem 0" }}>
        or use a magic link
      </div>

      <form action={magicAction} className="form">
        <label className="field">
          Player email for magic link
          <input className="input" name="email" type="email" autoComplete="email" required />
        </label>
        {magicState ? (
          <p role="status" className="legal">
            {magicState.ok ? "Check your email for the secure ALCL sign-in link." : magicState.message}
          </p>
        ) : null}
        <button className="btn" disabled={magicPending} type="submit">
          {magicPending ? "Sending…" : "Email magic link"}
        </button>
      </form>

      <p className="legal">
        Need an account? <Link href="/register">Create a player account</Link>. Teams are built
        after players sign in — teams do not log in.
      </p>
      <p className="legal">
        ALCL will never request an EA password, authentication token, or private game-account access.
      </p>
    </div>
  );
}
