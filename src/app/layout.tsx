import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "ALCL", template: "%s · ALCL" },
  description: "Independent community tournaments for Apex Legends.",
  openGraph: {
    title: "ALCL",
    description: "Independent community tournaments for Apex Legends.",
    type: "website",
    images: [{ url: "/alcl-og.svg", width: 1200, height: 630, alt: "ALCL original community tournament branding" }],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
