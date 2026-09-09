"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Overview", href: "/dashboard" },
  { label: "My profile", href: "/players/me" },
  { label: "My team", href: "/dashboard/team" },
];

export function DashboardTabs() {
  const pathname = usePathname();

  return (
    <nav className="dashboard-tabs" aria-label="Player dashboard">
      {tabs.map((tab) => {
        const active =
          tab.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link className={active ? "active" : ""} href={tab.href} key={tab.href}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
