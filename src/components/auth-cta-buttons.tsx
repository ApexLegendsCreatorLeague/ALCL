"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useNavSessionReady, useNavUser } from "@/components/auth-session-provider";

type AuthCtaButtonsProps = {
  showCreateTeam?: boolean;
  compact?: boolean;
  createTeamOnly?: boolean;
};

export function AuthCtaButtons({
  showCreateTeam = false,
  compact = false,
  createTeamOnly = false,
}: AuthCtaButtonsProps) {
  const user = useNavUser();
  const ready = useNavSessionReady();

  if (!ready) {
    return null;
  }

  if (createTeamOnly) {
    return (
      <Link
        className="btn btn-primary"
        href={user ? "/dashboard/team/create" : "/login?next=/dashboard/team/create"}
      >
        Create a Team
      </Link>
    );
  }

  if (user) {
    return (
      <>
        <Link className="btn btn-primary" href="/players/me">
          My Profile {!compact ? <ArrowRight size={14} /> : null}
        </Link>
        {showCreateTeam ? (
          <Link className="btn" href="/dashboard/team/create">
            Create a Team
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
        Sign In
      </Link>
      {showCreateTeam ? (
        <Link className="btn" href="/login?next=/dashboard/team/create">
          Create a Team
        </Link>
      ) : null}
    </>
  );
}
