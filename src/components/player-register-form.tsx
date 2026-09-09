"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { signUpWithPassword } from "@/server/actions/auth";

export function PlayerRegisterForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(signUpWithPassword, null);

  useEffect(() => {
    if (state?.ok && state.data.redirectTo) {
      router.push(state.data.redirectTo);
      router.refresh();
    }
  }, [router, state]);

  return (
    <form action={action} className="form">
      <p className="eyebrow">Player account</p>
      <label className="field">
        Display name
        <input
          className="input"
          name="displayName"
          type="text"
          autoComplete="nickname"
          minLength={2}
          maxLength={50}
          required
          placeholder="Your in-game name"
        />
      </label>
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
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <label className="field">
        Platform
        <select className="input" name="platform" defaultValue="PC" required>
          <option value="PC">PC</option>
          <option value="PlayStation">PlayStation</option>
          <option value="Xbox">Xbox</option>
          <option value="Nintendo Switch">Nintendo Switch</option>
        </select>
      </label>
      <label className="field">
        Region
        <select className="input" name="region" defaultValue="North America" required>
          <option>North America</option>
          <option>Europe</option>
          <option>Oceania</option>
          <option>Asia Pacific</option>
        </select>
      </label>
      {state && !state.ok ? (
        <p role="alert" className="legal">{state.message}</p>
      ) : state?.ok && state.data.emailConfirmationRequired ? (
        <p role="status" className="legal">
          Player account created. Confirm your email, then use{" "}
          <Link href="/login">Player sign in</Link>.
        </p>
      ) : null}
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Creating player account…" : "Create player account"}
      </button>
      <p className="legal">
        Already have a player account? <Link href="/login">Sign in</Link>. Create teams from your
        dashboard after you sign in — teams never log in.
      </p>
      <p className="legal">
        ALCL will never request an EA password, authentication token, or private game-account access.
      </p>
    </form>
  );
}
