"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { StatusBadge, Toast } from "@/components/alcl";

const steps = ["Team Information", "Roster", "Eligibility", "Review", "Submit"];
const emptyPlayer = { displayName: "", platform: "PC", role: "Flex", rank: "Diamond" };

export function RegistrationWizard() {
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    teamName: "",
    abbreviation: "",
    region: "North America",
    managerEmail: "",
    website: "",
    socialLink: "",
    players: Array.from({ length: 5 }, () => ({ ...emptyPlayer })),
    eligibilityAccepted: false,
    rosterLockAccepted: false,
    rulesAccepted: false,
  });

  const predatorCount = useMemo(
    () => form.players.filter((player) => player.rank === "Predator").length,
    [form.players],
  );
  const eligible = predatorCount <= 1;

  function updatePlayer(index: number, field: keyof typeof emptyPlayer, value: string) {
    setForm((current) => ({
      ...current,
      players: current.players.map((player, playerIndex) =>
        playerIndex === index ? { ...player, [field]: value } : player,
      ),
    }));
  }

  async function submit() {
    setSubmitting(true);
    setNotice("");
    const response = await fetch("/api/registrations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = (await response.json()) as { message?: string; id?: string };
    setSubmitting(false);
    setNotice(
      response.ok
        ? `Registration submitted${result.id ? ` · ${result.id.slice(0, 8)}` : ""}`
        : result.message ?? "Registration could not be submitted.",
    );
  }

  const canContinue =
    (step !== 0 || Boolean(form.teamName && form.abbreviation && form.managerEmail)) &&
    (step !== 1 || form.players.slice(0, 3).every((player) => player.displayName)) &&
    (step !== 2 || (eligible && form.eligibilityAccepted && form.rosterLockAccepted)) &&
    (step !== 4 || form.rulesAccepted);

  return (
    <div className="wizard">
      <div className="wizard-steps">
        {steps.map((label, index) => (
          <button
            type="button"
            className={`wizard-step ${index === step ? "active" : ""}`}
            onClick={() => index < step && setStep(index)}
            key={label}
          >
            0{index + 1} · {label}
          </button>
        ))}
      </div>
      <div className="card">
        <StatusBadge status={`Step ${step + 1} of 5`} />
        <h3>{steps[step]}</h3>
        <p>
          ALCL will never ask for your EA password, account credentials, or
          authentication tokens. Rank and results are self-reported or entered by
          organizers.
        </p>

        {step === 0 ? (
          <div className="form grid grid-2">
            <Field label="Team name" value={form.teamName} onChange={(value) => setForm({ ...form, teamName: value })} />
            <Field label="Abbreviation" value={form.abbreviation} maxLength={5} onChange={(value) => setForm({ ...form, abbreviation: value.toUpperCase() })} />
            <Select label="Region" value={form.region} options={["North America", "Europe", "Oceania", "Asia Pacific"]} onChange={(value) => setForm({ ...form, region: value })} />
            <Field label="Manager email" type="email" value={form.managerEmail} onChange={(value) => setForm({ ...form, managerEmail: value })} />
            <Field label="Website (optional)" value={form.website} onChange={(value) => setForm({ ...form, website: value })} />
            <Field label="Social link (optional)" value={form.socialLink} onChange={(value) => setForm({ ...form, socialLink: value })} />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="form">
            {form.players.map((player, index) => (
              <div className="card" key={index}>
                <strong>{index < 3 ? `Starter ${index + 1}` : `Substitute ${index - 2}`}</strong>
                <div className="grid grid-2" style={{ marginTop: 12 }}>
                  <Field label="Display name" value={player.displayName} onChange={(value) => updatePlayer(index, "displayName", value)} />
                  <Select label="Platform" value={player.platform} options={["PC", "PlayStation", "Xbox", "Nintendo Switch"]} onChange={(value) => updatePlayer(index, "platform", value)} />
                  <Select label="Role" value={player.role} options={["IGL", "Fragger", "Support", "Flex", "Substitute"]} onChange={(value) => updatePlayer(index, "role", value)} />
                  <Select label="Rank snapshot" value={player.rank} options={["Platinum", "Diamond", "Master", "Predator"]} onChange={(value) => updatePlayer(index, "rank", value)} />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="form">
            <div className="card">
              <strong>{eligible ? "Roster currently eligible" : "Roster needs changes"}</strong>
              <p>
                Default example rule: maximum one Predator across all five competitive
                roster slots. Current count: {predatorCount}.
              </p>
            </div>
            <Check checked={form.eligibilityAccepted} onChange={(value) => setForm({ ...form, eligibilityAccepted: value })}>
              I confirm the roster meets the published event eligibility rules.
            </Check>
            <Check checked={form.rosterLockAccepted} onChange={(value) => setForm({ ...form, rosterLockAccepted: value })}>
              I understand changes after the deadline require organizer approval.
            </Check>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid grid-2">
            <div className="card"><small>TEAM</small><h3>{form.teamName} · {form.abbreviation}</h3><p>{form.region} · {form.managerEmail}</p></div>
            <div className="card"><small>REGISTERED ROSTER</small><h3>{form.players.filter((player) => player.displayName).length} players</h3><p>{predatorCount} Predator rank snapshot</p></div>
            <div className="card" style={{ gridColumn: "1 / -1" }}><ShieldCheck color="var(--lime)" /><p>Eligibility is recalculated on the server. ALCL never asks for EA credentials, passwords, or authentication tokens.</p></div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="form">
            <div className="card"><strong>Timestamped organizer review</strong><p>The registration will enter Pending status. Rank and eligibility configuration snapshots are retained for auditability.</p></div>
            <Check checked={form.rulesAccepted} onChange={(value) => setForm({ ...form, rulesAccepted: value })}>
              I accept the published event rules and terms of participation.
            </Check>
          </div>
        ) : null}

        <div className="actions">
          {step > 0 ? <button className="btn" type="button" onClick={() => setStep(step - 1)}><ChevronLeft size={14} /> Back</button> : <span />}
          {step < 4 ? (
            <button className="btn btn-primary" disabled={!canContinue} type="button" onClick={() => setStep(step + 1)}>Continue <ChevronRight size={14} /></button>
          ) : (
            <button className="btn btn-primary" disabled={!canContinue || submitting} type="button" onClick={submit}>{submitting ? "Submitting…" : "Submit registration"}</button>
          )}
        </div>
      </div>
      {notice ? <Toast message={notice} onClose={() => setNotice("")} /> : null}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", maxLength }: { label: string; value: string; onChange: (value: string) => void; type?: string; maxLength?: number }) {
  return <label className="field">{label}<input className="input" type={type} value={value} maxLength={maxLength} required onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="field">{label}<select className="input" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: React.ReactNode }) {
  return <label style={{ display: "flex", gap: 10, color: "var(--muted)" }}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{children}</label>;
}
