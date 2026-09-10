import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/alcl";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { RegistrationWizard } from "@/components/registration-wizard";

export const metadata: Metadata = {
  title: "Create a Team",
  description: "Build a team roster from registered ALCL player accounts.",
};

export default function CreateTeamPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Team Manager Setup"
        title="Create a Team"
        copy="You will be the team manager — one account controls the team. Add registered player accounts to your roster."
      />
      <section className="container dashboard-page">
        <DashboardTabs />
        <div className="actions" style={{ marginBottom: 18 }}>
          <Link className="btn" href="/players/me">
            Back to Player Profile
          </Link>
        </div>
        <RegistrationWizard />
      </section>
    </AppShell>
  );
}
