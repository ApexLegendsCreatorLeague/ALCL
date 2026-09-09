import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

function loginRedirect(request: NextRequest, nextPath: string, error?: string) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";
  redirectUrl.searchParams.set("next", nextPath);
  if (error) redirectUrl.searchParams.set("error", error);
  return NextResponse.redirect(redirectUrl);
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminPath = pathname.startsWith("/admin");
  const isDashboardPath = pathname.startsWith("/dashboard");
  const protectedPath = isAdminPath || isDashboardPath;

  const url = supabaseUrl();
  const key = supabaseAnonKey();

  if (!url || !key) {
    if (protectedPath) {
      return loginRedirect(request, pathname, "auth_required");
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && protectedPath) {
    const redirect = loginRedirect(request, pathname);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if (user && isAdminPath) {
    const { data: roles } = await supabase
      .from("profile_roles")
      .select("role, expires_at")
      .eq("profile_id", user.id)
      .in("role", ["admin", "organizer"]);

    const now = Date.now();
    const canManage = (roles ?? []).some(
      ({ expires_at }) => !expires_at || Date.parse(expires_at) > now,
    );

    if (!canManage) {
      const redirect = NextResponse.redirect(new URL("/dashboard?error=forbidden", request.url));
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }
  }

  return response;
}
