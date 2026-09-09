import type { Metadata } from "next";

import { PlayerProfileNotFound, PlayerProfileView } from "@/components/player-profile-view";
import { getPlayerProfile } from "@/server/player-profile";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getPlayerProfile(id);
  return {
    title: profile ? `${profile.displayName} · ALCL Player` : "Player profile",
  };
}

export default async function PlayerProfilePage({ params }: Props) {
  const { id } = await params;
  const profile = await getPlayerProfile(id);

  if (!profile) {
    return <PlayerProfileNotFound ref={id} />;
  }

  return <PlayerProfileView profile={profile} />;
}
