"use client";

import { useActionState } from "react";

import { PLAYER_SOCIAL_FIELDS } from "@/lib/social-links";
import { savePlayerProfileAndRedirect } from "@/server/actions/player-profile";
import type { PlayerProfile } from "@/server/player-profile";

function Field({
  label,
  hint,
  name,
  defaultValue,
  error,
  textarea,
}: {
  label: string;
  hint?: string;
  name: string;
  defaultValue?: string | null;
  error?: string;
  textarea?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {textarea ? (
        <textarea
          className="input textarea"
          name={name}
          defaultValue={defaultValue ?? ""}
          maxLength={500}
          rows={4}
        />
      ) : (
        <input className="input" name={name} defaultValue={defaultValue ?? ""} />
      )}
      {hint ? <small className="legal">{hint}</small> : null}
      {error ? <small style={{ color: "#ff986f" }}>{error}</small> : null}
    </label>
  );
}

export function PlayerProfileEditForm({ profile }: { profile: PlayerProfile }) {
  const [state, action, pending] = useActionState(savePlayerProfileAndRedirect, null);

  return (
    <form className="card profile-edit-form" action={action}>
      <input type="hidden" name="playerId" value={profile.playerId} />

      <div className="profile-edit-intro">
        <h3>Public profile details</h3>
        <p className="legal">
          These fields appear on your tournament player page. Display name and platform are set
          during registration.
        </p>
      </div>

      <div className="form">
        <Field
          label="Username"
          name="username"
          defaultValue={profile.username}
          hint="3–30 characters. Letters, numbers, and underscores only."
          error={state && !state.ok ? state.fieldErrors?.username?.[0] : undefined}
        />
        <Field
          label="Bio"
          name="bio"
          defaultValue={profile.bio}
          hint="Short intro for scouts, casters, and fans (500 characters max)."
          textarea
          error={state && !state.ok ? state.fieldErrors?.bio?.[0] : undefined}
        />
      </div>

      <div className="profile-edit-socials">
        <h4>Social links</h4>
        <p className="legal">Add the platforms you stream or post on. Handles and full URLs both work.</p>
        <div className="form">
          {PLAYER_SOCIAL_FIELDS.map((field) => (
            <Field
              key={field.platform}
              label={field.label}
              name={field.formName}
              defaultValue={profile[field.profileKey]}
              hint={field.hint}
              error={
                state && !state.ok
                  ? state.fieldErrors?.[field.formName as keyof typeof state.fieldErrors]?.[0]
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {state && !state.ok ? <p style={{ color: "#ff986f" }}>{state.message}</p> : null}

      <div className="actions">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
