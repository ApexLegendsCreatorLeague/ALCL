"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect } from "react";

import { sendMagicLink, signInWithPassword } from "@/server/actions/auth";

function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard/player";
  }
  return next;
}

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const callbackError = searchParams.get("error");

  const [passwordState, passwordAction, passwordPending] = useActionState(
    signInWithPassword,
    null,
  );
  const [magicState, magicAction, magicPending] = useActionState(sendMagicLink, null);

  useEffect(() => {
    if (passwordState?.ok) {
      router.push(nextPath);
      router.refresh();
    }
  }, [passwordState, nextPath, router]);

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

      <form action={passwordAction} className="form">
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
        {passwordState && !passwordState.ok ? (
          <p role="alert" className="legal">{passwordState.message}</p>
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
