import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeader } from "@/components/alcl";
import { PlayerProfileEditForm } from "@/components/player-profile-edit-form";
import { getCurrentUser } from "@/server/auth";
import { getPlayerProfile } from "@/server/player-profile";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Edit Player Profile" };

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
          eyebrow="Edit Profile"
          title="Profile Not Found"
          copy="This player profile does not exist."
        />
        <section className="container">
          <EmptyState title="Profile Unavailable" message="This player profile does not exist." />
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
        eyebrow="Your Profile"
        title="Edit Public Profile"
        copy="Update the details fans and tournament viewers see on your ALCL player page."
      />
      <section className="container profile-edit-page">
        <div className="actions" style={{ marginBottom: 18 }}>
          <Link className="btn" href={`/players/${profile.playerId}`}>
            Back to Profile
          </Link>
        </div>
        <PlayerProfileEditForm profile={profile} />
      </section>
    </AppShell>
  );
}
