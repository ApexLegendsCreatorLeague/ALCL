"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type RegisterResponse =
  | {
      ok: true;
      redirectTo: string | null;
      emailConfirmationRequired?: boolean;
      needsSignIn?: boolean;
      message?: string;
      warning?: string;
    }
  | { ok: false; message: string };

export function PlayerRegisterForm() {
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const result = (await response.json()) as RegisterResponse;

      if (!response.ok || !result.ok) {
        setError(!result.ok ? result.message : "Registration failed.");
        return;
      }

      if (result.redirectTo) {
        window.location.assign(result.redirectTo);
        return;
      }

      if (result.emailConfirmationRequired) {
        setStatus("Player account created. Confirm your email, then sign in.");
        return;
      }

      if (result.needsSignIn) {
        setStatus(result.message ?? "Player account created. Sign in to continue.");
        return;
      }

      setStatus(result.message ?? "Player account created.");
    } catch {
      setError("Registration could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
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
          <option value="North America">North America</option>
          <option value="Europe">Europe</option>
          <option value="Oceania">Oceania</option>
          <option value="Asia Pacific">Asia Pacific</option>
        </select>
      </label>
      {error ? (
        <p role="alert" className="legal">{error}</p>
      ) : null}
      {status ? (
        <p role="status" className="legal">
          {status}{" "}
          {status.includes("Sign in") ? <Link href="/login">Go to sign in</Link> : null}
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
