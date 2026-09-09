import type { Metadata } from "next";

import { PlayerProfileNotFound, PlayerProfileView } from "@/components/player-profile-view";
import { getCurrentUser } from "@/server/auth";
import { getPlayerProfile } from "@/server/player-profile";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getPlayerProfile(id);
  return {
    title: profile ? `${profile.displayName} · ALCL Player` : "Player profile",
  };
}

export default async function PlayerProfilePage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [profile, user] = await Promise.all([getPlayerProfile(id), getCurrentUser()]);

  if (!profile) {
    return <PlayerProfileNotFound ref={id} />;
  }

  const isOwner = Boolean(user && profile.profileId === user.id);

  return (
    <PlayerProfileView
      profile={profile}
      isOwner={isOwner}
      saved={query.status === "profile_saved"}
    />
  );
}
