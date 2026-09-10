import Link from "next/link";
import { useId } from "react";

type LogoProps = {
  size?: number;
  className?: string;
  title?: string;
};

export function AlclLogoMark({
  size = 40,
  className = "",
  title = "ALCL",
}: LogoProps) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      className={`alcl-logo-mark ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient
          id={`${uid}-ring`}
          x1="10"
          y1="4"
          x2="54"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#efffb8" />
          <stop offset="0.4" stopColor="#c7ff47" />
          <stop offset="1" stopColor="#ff7a45" />
        </linearGradient>
        <linearGradient
          id={`${uid}-face`}
          x1="32"
          y1="8"
          x2="32"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#141a22" />
          <stop offset="1" stopColor="#0a0d12" />
        </linearGradient>
        <radialGradient
          id={`${uid}-glow`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(32 32) scale(22)"
        >
          <stop stopColor="#c7ff47" stopOpacity="0.16" />
          <stop offset="1" stopColor="#c7ff47" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M32 4 54.6 17v30L32 60 9.4 47V17L32 4Z"
        fill={`url(#${uid}-face)`}
        stroke={`url(#${uid}-ring)`}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M32 4 54.6 17v30L32 60 9.4 47V17L32 4Z"
        fill={`url(#${uid}-glow)`}
        stroke="none"
      />
      <path
        d="M32 55.5V49M9.4 32h5.2M54.6 32h-5.2"
        stroke={`url(#${uid}-ring)`}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="32" r="1.6" fill="#ff5c4a" />
    </svg>
  );
}

export function AlclBrand({
  href = "/",
  compact = false,
  className = "",
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <AlclLogoMark size={compact ? 34 : 40} />
      {!compact ? (
        <span className="brand-wordmark">
          <strong>ALCL</strong>
          <small>Creator League</small>
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link className={`brand ${className}`.trim()} href={href} aria-label="ALCL home">
        {content}
      </Link>
    );
  }

  return <div className={`brand ${className}`.trim()}>{content}</div>;
}

export function AlclSidebarBrand({
  suffix,
  href = "/",
}: {
  suffix: string;
  href?: string;
}) {
  return (
    <Link className="sidebar-brand" href={href}>
      <AlclLogoMark size={32} className="sidebar-brand-mark" />
      <span className="sidebar-brand-text">
        ALCL <span>{suffix}</span>
      </span>
    </Link>
  );
}
