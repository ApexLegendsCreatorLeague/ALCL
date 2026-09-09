import Link from "next/link";
import { Menu, Search, ShieldCheck } from "lucide-react";
import { EA_DISCLAIMER, EA_POLICY_REVIEWED_AT } from "@/config/community-tournament";
import { Container } from "@/components/ui";

const nav = [
  ["Season", "/league"],
  ["Tournaments", "/tournaments"],
  ["Standings", "/standings"],
  ["Teams", "/teams"],
  ["Players", "/players"],
  ["Championship", "/championship"],
];

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="ALCL home">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <b>AL</b>
      </span>
      {!compact ? (
        <span>
          <strong>ALCL</strong>
          <small>Creator League</small>
        </span>
      ) : null}
    </Link>
  );
}

export function Navbar() {
  return (
    <header className="site-header">
      <Container className="nav-container">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.map(([label, href]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <Link href="/teams" className="icon-link" aria-label="Search teams and players">
            <Search size={18} />
          </Link>
          <Link className="button button-secondary nav-login" href="/login">
            Player sign in
          </Link>
          <Link className="button button-primary nav-register" href="/register">
            Register
          </Link>
          <button className="mobile-menu" aria-label="Open menu">
            <Menu size={22} />
          </button>
        </div>
      </Container>
    </header>
  );
}

export function LegalDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={compact ? "legal-strip compact" : "legal-strip"}>
      <ShieldCheck size={compact ? 16 : 19} aria-hidden="true" />
      <div>
        <strong>{EA_DISCLAIMER}</strong>
        {!compact ? (
          <p>
            ALCL is an independent community tournament organization. Participants
            remain subject to applicable EA terms and game rules.
          </p>
        ) : null}
      </div>
    </aside>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <Container>
        <LegalDisclaimer />
        <div className="footer-grid">
          <div>
            <Brand />
            <p>
              Independent community tournaments for Apex Legends. Built for players,
              teams, creators, and organizers.
            </p>
          </div>
          <div>
            <strong>Competition</strong>
            <Link href="/tournaments">Tournaments</Link>
            <Link href="/standings">Standings</Link>
            <Link href="/rules">Sign up rules</Link>
            <Link href="/register">Register</Link>
          </div>
          <div>
            <strong>Community</strong>
            <Link href="/teams">Teams</Link>
            <Link href="/players">Players</Link>
            <Link href="/hall-of-fame">Hall of Fame</Link>
          </div>
          <div>
            <strong>Organization</strong>
            <Link href="/supporters">Community supporters</Link>
            <Link href="/legal">Legal & disclaimer</Link>
            <Link href="/login">Player sign in</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 ALCL. Original community branding.</span>
          <span>Policy reviewed {EA_POLICY_REVIEWED_AT}</span>
        </div>
      </Container>
    </footer>
  );
}
