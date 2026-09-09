import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeader } from "@/components/alcl";
import { PlayerProfileEditForm } from "@/components/player-profile-edit-form";
import { getCurrentUser } from "@/server/auth";
import { getPlayerProfile } from "@/server/player-profile";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Edit player profile" };

export default async function EditPlayerProfilePage({ params }: Props) {
  const { id } = await params;
  const [user, profile] = await Promise.all([getCurrentUser(), getPlayerProfile(id)]);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/players/${id}/edit`)}`);
  }

  if (!profile) {
    return (
      <AppShell>
        <PageHeader
          eyebrow="Edit profile"
          title="Profile not found"
          copy="This player profile does not exist."
        />
        <section className="container">
          <EmptyState title="Profile unavailable" message="This player profile does not exist." />
        </section>
      </AppShell>
    );
  }

  if (profile.profileId !== user.id) {
    redirect(`/players/${profile.playerId}`);
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Your profile"
        title="Edit public profile"
        copy="Update the details fans and tournament viewers see on your ALCL player page."
      />
      <section className="container profile-edit-page">
        <div className="actions" style={{ marginBottom: 18 }}>
          <Link className="btn" href={`/players/${profile.playerId}`}>
            Back to profile
          </Link>
        </div>
        <PlayerProfileEditForm profile={profile} />
      </section>
    </AppShell>
  );
}
