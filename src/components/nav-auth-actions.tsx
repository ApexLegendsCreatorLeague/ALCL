"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useNavSessionReady, useNavUser } from "@/components/auth-session-provider";
import { NavProfileMenu } from "@/components/nav-profile-menu";

export function NavAuthActions() {
  const user = useNavUser();
  const ready = useNavSessionReady();

  if (!ready) {
    return <span className="nav-auth-loading" aria-label="Checking sign-in status" />;
  }

  if (user) {
    return <NavProfileMenu user={user} />;
  }

  return (
    <>
      <Link className="btn nav-login" href="/login">
        Player sign in
      </Link>
      <Link className="btn btn-primary nav-cta" href="/register">
        Register <ArrowRight size={14} />
      </Link>
    </>
  );
}
