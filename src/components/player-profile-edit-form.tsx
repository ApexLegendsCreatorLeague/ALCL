"use client";

import { useActionState } from "react";

import { APEX_LEGENDS } from "@/lib/apex-legends";
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
  maxLength,
}: {
  label: string;
  hint?: string;
  name: string;
  defaultValue?: string | null;
  error?: string;
  textarea?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {textarea ? (
        <textarea
          className="input textarea"
          name={name}
          defaultValue={defaultValue ?? ""}
          maxLength={maxLength ?? 500}
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
  const legendFields = [
    { name: "mainLegend1", label: "#1 Most Played", value: profile.recruitment.topLegends[0] },
    { name: "mainLegend2", label: "#2 Second Main", value: profile.recruitment.topLegends[1] },
    { name: "mainLegend3", label: "#3 Third Main", value: profile.recruitment.topLegends[2] },
  ] as const;

  return (
    <form className="card profile-edit-form" action={action}>
      <input type="hidden" name="playerId" value={profile.playerId} />

      <div className="profile-edit-intro">
        <h3>Public Profile Details</h3>
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

      <div className="profile-edit-recruitment">
        <h4>Team Recruitment</h4>
        <p className="legal">
          Help captains understand why they should draft you. This shows on your public profile when
          you are a free agent or actively looking.
        </p>
        <label className="field profile-checkbox-field">
          <input
            type="checkbox"
            name="lookingForTeam"
            value="true"
            defaultChecked={profile.recruitment.lookingForTeam}
          />
          <span>I am open to team offers</span>
        </label>
        <div className="form">
          <div className="field">
            <span>Top 3 Legends Used</span>
            <p className="legal">
              Captains use this to build balanced rosters and avoid duplicate legend picks.
            </p>
            <div className="profile-legend-grid">
              {legendFields.map((field) => (
                <label className="field" key={field.name}>
                  <span>{field.label}</span>
                  <select className="input" name={field.name} defaultValue={field.value ?? ""}>
                    <option value="">Select Legend</option>
                    {APEX_LEGENDS.map((legend) => (
                      <option key={legend} value={legend}>
                        {legend}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>
          <Field
            label="Availability"
            name="availability"
            defaultValue={profile.recruitment.availability}
            hint="Days, time zones, and hours you can scrim or compete."
            error={state && !state.ok ? state.fieldErrors?.availability?.[0] : undefined}
          />
          <Field
            label="Pitch to Captains"
            name="recruitmentPitch"
            defaultValue={profile.recruitment.recruitmentPitch}
            hint="What you bring to a roster, past experience, comms style, and what kind of team you want."
            textarea
            maxLength={800}
            error={state && !state.ok ? state.fieldErrors?.recruitmentPitch?.[0] : undefined}
          />
        </div>
      </div>

      <div className="profile-edit-socials">
        <h4>Social Links</h4>
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
          {pending ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </form>
  );
}
