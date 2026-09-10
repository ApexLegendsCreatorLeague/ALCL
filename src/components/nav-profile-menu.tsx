"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";

import type { NavUser } from "@/types/nav";
import { signOut } from "@/server/actions/auth";

export function NavProfileMenu({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div className="nav-profile" ref={rootRef}>
      <button
        type="button"
        className="nav-profile-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="nav-profile-avatar" aria-hidden="true">
          {user.initials}
        </span>
        <span className="nav-profile-label">
          <strong>{user.displayName}</strong>
          {user.username ? <small>@{user.username}</small> : null}
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open ? (
        <div className="nav-profile-menu" role="menu">
          <Link href="/players/me" role="menuitem" onClick={() => setOpen(false)}>
            <UserRound size={15} aria-hidden="true" />
            My Profile
          </Link>
          <Link href="/dashboard" role="menuitem" onClick={() => setOpen(false)}>
            Dashboard
          </Link>
          {user.canManageCompetitions ? (
            <Link href="/admin" role="menuitem" onClick={() => setOpen(false)}>
              Admin
            </Link>
          ) : null}
          <Link href="/dashboard/team/create" role="menuitem" onClick={() => setOpen(false)}>
            Create a Team
          </Link>
          <form action={signOut}>
            <button type="submit" role="menuitem">
              <LogOut size={15} aria-hidden="true" />
              Sign Out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
