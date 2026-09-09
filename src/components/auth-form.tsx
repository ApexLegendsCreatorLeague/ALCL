"use client";

import { useActionState } from "react";

import { sendMagicLink, signInWithPassword } from "@/server/actions/auth";

export function AuthForm() {
  const [passwordState, passwordAction, passwordPending] = useActionState(
    signInWithPassword,
    null,
  );
  const [magicState, magicAction, magicPending] = useActionState(sendMagicLink, null);

  return (
    <div className="form">
      <form action={passwordAction} className="form">
        <label className="field">
          Email
          <input className="input" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="field">
          ALCL password
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
        <button className="btn btn-primary" disabled={passwordPending}>
          {passwordPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div aria-hidden="true" className="legal">or use a magic link</div>

      <form action={magicAction} className="form">
        <label className="field">
          Email for magic link
          <input className="input" name="email" type="email" autoComplete="email" required />
        </label>
        {magicState ? (
          <p role="status" className="legal">
            {magicState.ok ? "Check your email for the secure ALCL sign-in link." : magicState.message}
          </p>
        ) : null}
        <button className="btn" disabled={magicPending}>
          {magicPending ? "Sending…" : "Email magic link"}
        </button>
      </form>
      <p className="legal">
        These are ALCL credentials. ALCL will never request an EA password,
        authentication token, or private game-account access.
      </p>
    </div>
  );
}
