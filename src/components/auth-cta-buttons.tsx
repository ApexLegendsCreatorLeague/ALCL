"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useNavSessionReady, useNavUser } from "@/components/auth-session-provider";

type AuthCtaButtonsProps = {
  showCreateTeam?: boolean;
  compact?: boolean;
};

export function AuthCtaButtons({ showCreateTeam = false, compact = false }: AuthCtaButtonsProps) {
  const user = useNavUser();
  const ready = useNavSessionReady();

  if (!ready) {
    return null;
  }

  if (user) {
    return (
      <>
        <Link className="btn btn-primary" href="/players/me">
          My profile {!compact ? <ArrowRight size={14} /> : null}
        </Link>
        {showCreateTeam ? (
          <Link className="btn" href="/dashboard/team/create">
            Create a team
          </Link>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Link className="btn btn-primary" href="/register">
        Register {!compact ? <ArrowRight size={14} /> : null}
      </Link>
      <Link className="btn" href="/login">
        Player sign in
      </Link>
      {showCreateTeam ? (
        <Link className="btn" href="/login?next=/dashboard/team/create">
          Create a team
        </Link>
      ) : null}
    </>
  );
}
