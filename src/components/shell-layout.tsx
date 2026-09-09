"use client";

import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";

import { AuthSessionProvider } from "@/components/auth-session-provider";
import { NavAuthActions } from "@/components/nav-auth-actions";
import { Footer } from "@/components/alcl";
import type { NavUser } from "@/types/nav";

function Navbar() {
  return (
    <nav className="nav">
      <div className="container nav-inner">
        <Link className="brand" href="/">
          <span className="brand-mark">A</span>ALCL
        </Link>
        <div className="nav-links">
          <Link href="/league">League</Link>
          <Link href="/tournaments">Tournaments</Link>
          <Link href="/standings">Standings</Link>
          <Link href="/teams">Teams</Link>
          <Link href="/players">Players</Link>
          <Link href="/championship">Championship</Link>
          <Link aria-label="Search ALCL" href="/teams">
            <SearchIcon size={16} />
          </Link>
        </div>
        <div className="nav-actions">
          <NavAuthActions />
        </div>
      </div>
    </nav>
  );
}

function ShellFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <Navbar />
      <main className="main">{children}</main>
      <Footer />
    </div>
  );
}

export function ShellLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user: NavUser | null;
}) {
  return (
    <AuthSessionProvider initialUser={user}>
      <ShellFrame>{children}</ShellFrame>
    </AuthSessionProvider>
  );
}

