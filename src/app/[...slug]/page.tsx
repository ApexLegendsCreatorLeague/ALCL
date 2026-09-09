import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RoutePage } from "@/components/pages";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import {
  AuthorizationError,
  requireCompetitionManager,
  requireUser,
} from "@/server/auth";

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const label = slug.at(-1)?.replaceAll("-", " ") ?? "ALCL";
  return { title: label.replace(/\b\w/g, (letter) => letter.toUpperCase()) };
}

export default async function CatchAllPage({ params }: Props) {
  const { slug } = await params;
  const nextPath = `/${slug.join("/")}`;

  if (slug[0] === "admin") {
    if (!isSupabaseConfigured()) {
      redirect(`/login?next=${encodeURIComponent(nextPath)}&error=auth_required`);
    }
    try {
      await requireCompetitionManager();
    } catch (error) {
      if (error instanceof AuthorizationError) {
        redirect("/dashboard?error=forbidden");
      }
      redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    }
  } else if (slug[0] === "dashboard") {
    if (!isSupabaseConfigured()) {
      redirect(`/login?next=${encodeURIComponent(nextPath)}&error=auth_required`);
    }
    try {
      await requireUser();
    } catch {
      redirect(`/login?next=${encodeURIComponent(nextPath)}`);
    }
  }

  return await RoutePage({ segments: slug });
}
