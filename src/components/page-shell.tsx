import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/ui";
import { LegalDisclaimer } from "@/components/site-shell";
import { isSupabaseConfigured } from "@/lib/supabase/server";

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
}: {
  title: string;
  description: string;
  children: ReactNode;
  admin?: boolean;
}) {
  const links = admin
    ? [
        ["Overview", "/admin"],
        ["Tournaments", "/admin/tournaments"],
        ["Matches", "/admin/matches"],
        ["Live data", "/admin/live-data"],
        ["Registrations", "/admin/registrations"],
        ["Teams", "/admin/teams"],
        ["Players", "/admin/players"],
        ["Scoring", "/admin/scoring"],
        ["Supporters", "/admin/supporters"],
      ]
    : [
        ["Overview", "/dashboard"],
        ["My team", "/dashboard/team"],
        ["Player profile", "/dashboard/player"],
      ];
  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <Link href="/" className="sidebar-brand">ALCL <span>{admin ? "CONTROL" : "PORTAL"}</span></Link>
        <nav>
          {links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>
        <Link className="sidebar-exit" href="/">Return to public site</Link>
      </aside>
      <main className="dashboard-main">
        <header><div><p className="eyebrow">{admin ? "ORGANIZER WORKSPACE" : "COMPETITOR WORKSPACE"}</p><h1>{title}</h1><p>{description}</p></div>{isSupabaseConfigured() ? null : <span className="demo-pill">DEMO MODE</span>}</header>
        {children}
      </main>
    </div>
  );
}
