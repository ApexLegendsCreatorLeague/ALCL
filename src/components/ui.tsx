import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Container({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1440px] px-5 md:px-8", className)}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
  return (
    <span className={cn("badge", `badge-${tone}`)}>{children}</span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Live" || status === "Registration Open" || status === "Approved"
      ? "success"
      : status === "Upcoming" || status === "Pending"
        ? "warning"
        : status === "Rejected" || status === "Cancelled"
          ? "danger"
          : "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button className={cn("button", `button-${variant}`, className)} {...props} />
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  return (
    <Link className={cn("button", `button-${variant}`, className)} href={href}>
      {children}
    </Link>
  );
}

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </Card>
  );
}

export function EmptyState({
  title = "Nothing Here Yet",
  description = "Published information will appear here.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card className="empty-state">
      <div className="empty-mark">AL</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </Card>
  );
}

export function LoadingState() {
  return (
    <div aria-label="Loading" className="loading-grid">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="loading-card" key={index} />
      ))}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="error-state" role="alert">
      <strong>Unable to load this view</strong>
      <p>{message}</p>
    </Card>
  );
}
