import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/ui";
import { AlclSidebarBrand } from "@/components/alcl-logo";
import { LegalDisclaimer } from "@/components/site-shell";
import { signOut } from "@/server/actions/auth";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
  tournament = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  tournament?: boolean;
}) {
  return (
    <section className="page-hero">
      <div className="grid-glow" />
      <Container>
        <div className="breadcrumbs">
          <Link href="/">ALCL</Link>
          <ChevronRight size={14} />
          <span>{title}</span>
        </div>
        <div className="page-hero-grid">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h1>{title}</h1>
            {description ? <p>{description}</p> : null}
          </div>
          {children ? <div>{children}</div> : null}
        </div>
        {tournament ? <LegalDisclaimer compact /> : null}
      </Container>
    </section>
  );
}

export function Tabs({
  tabs,
  active,
}: {
  tabs: Array<{ label: string; href: string }>;
  active?: string;
}) {
  return (
    <nav className="tabs" aria-label="Section navigation">
      {tabs.map((tab) => (
        <Link className={tab.label === active ? "active" : ""} href={tab.href} key={tab.href}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function PageSection({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`page-section ${className}`}><Container>{children}</Container></section>;
}

export function DashboardShell({
  title,
  description,
  children,
  admin = false,
  activePath,
}: {
  title: string;
  description: string;
  children: ReactNode;
  admin?: boolean;
  activePath?: string;
}) {
  const links = admin
    ? [
        ["Overview", "/admin"],
        ["Registrations", "/admin/registrations"],
        ["Tournaments", "/admin/tournaments"],
        ["Matches", "/admin/matches"],
        ["Live Data", "/admin/live-data"],
        ["Scoring", "/admin/scoring"],
        ["Teams", "/admin/teams"],
        ["Players", "/admin/players"],
        ["Supporters", "/admin/supporters"],
      ]
    : [
        ["Overview", "/dashboard"],
        ["My Team", "/dashboard/team"],
        ["Player Profile", "/players/me"],
      ];
  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <AlclSidebarBrand suffix={admin ? "CONTROL" : "PORTAL"} />
        <nav>
          {links.map(([label, href]) => {
            const current = activePath ?? (admin ? "/admin" : "/dashboard");
            const isActive =
              current === href ||
              (href !== "/admin" && href !== "/dashboard" && current.startsWith(`${href}/`));
            return (
              <Link className={isActive ? "active" : ""} href={href} key={href}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <Link className="sidebar-exit" href="/">Return to Public Site</Link>
          {admin ? (
            <form action={signOut}>
              <button className="sidebar-exit" type="submit">Sign Out</button>
            </form>
          ) : null}
        </div>
      </aside>
      <main className="dashboard-main">
        <header><div><p className="eyebrow">{admin ? "Organizer Workspace" : "Competitor Workspace"}</p><h1>{title}</h1><p>{description}</p></div></header>
        {children}
      </main>
    </div>
  );
}
