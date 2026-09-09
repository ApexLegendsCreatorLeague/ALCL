"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { navUserFromParts, navUserFromPlayerMe } from "@/lib/auth/nav-user-map";
import { createBrowserSupabase, createBrowserSupabaseAsync } from "@/lib/supabase/browser";
import type { NavUser } from "@/types/nav";

type SessionState = {
  user: NavUser | null;
  ready: boolean;
};

const NavUserContext = createContext<SessionState>({ user: null, ready: false });

export function useNavUser() {
  return useContext(NavUserContext).user;
}

export function useNavSessionReady() {
  return useContext(NavUserContext).ready;
}

async function resolveNavUserFromApi() {
  const response = await fetch("/api/players/me", {
    credentials: "same-origin",
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    return undefined;
  }

  const payload = (await response.json()) as {
    profileId: string;
    displayName: string;
    username: string | null;
  };

  if (!payload.profileId) {
    return null;
  }

  return navUserFromPlayerMe(payload);
}

async function resolveNavUserFromBrowser() {
  const supabase = createBrowserSupabase() ?? (await createBrowserSupabaseAsync());
  if (!supabase) {
    return undefined;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .maybeSingle();

  return navUserFromParts({
    profileId: user.id,
    displayName: profile?.display_name ?? "",
    username: profile?.username ?? null,
    email: user.email,
    metadataDisplayName: user.user_metadata?.display_name,
  });
}

export function AuthSessionProvider({
  initialUser,
  children,
}: {
  initialUser: NavUser | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [session, setSession] = useState<SessionState>({
    user: initialUser,
    ready: Boolean(initialUser),
  });

  const syncSession = useCallback(async () => {
    const browserUser = await resolveNavUserFromBrowser();
    if (browserUser !== undefined) {
      setSession({ user: browserUser, ready: true });
      return;
    }

    const apiUser = await resolveNavUserFromApi();
    if (apiUser !== undefined) {
      setSession({ user: apiUser, ready: true });
      return;
    }

    setSession((current) => ({
      user: current.user ?? initialUser,
      ready: true,
    }));
  }, [initialUser]);

  useEffect(() => {
    setSession((current) => ({
      user: initialUser ?? current.user,
      ready: current.ready || Boolean(initialUser),
    }));
  }, [initialUser]);

  useEffect(() => {
    void syncSession();

    let subscription: { unsubscribe: () => void } | undefined;

    void createBrowserSupabaseAsync().then((supabase) => {
      if (!supabase) {
        return;
      }

      const result = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" && pathname !== "/account/reset-password") {
          window.location.assign("/account/reset-password");
          return;
        }

        void syncSession();
      });
      subscription = result.data.subscription;
    });

    return () => subscription?.unsubscribe();
  }, [pathname, syncSession]);

  return <NavUserContext.Provider value={session}>{children}</NavUserContext.Provider>;
}
