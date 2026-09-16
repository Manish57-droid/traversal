import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up", "/forgot-password", "/reset-password"];
const TRUSTED_USER_HEADER = "x-verified-user-id";

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

export async function middleware(req: NextRequest) {
  // Client-supplied values for our trusted header are never honored —
  // stripped immediately, before anything else runs. Every matched
  // path (this middleware covers all pages AND all /api/** routes —
  // see `config.matcher` below) goes through this middleware before
  // reaching any layout or route handler, so whatever we set on
  // `requestHeaders` below is the only value downstream code will
  // ever see for this header; a request can't forge it.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete(TRUSTED_USER_HEADER);

  // @supabase/ssr wants to update the session cookie mid-request
  // (token refresh); collect what it wants set here instead of
  // building a NextResponse immediately, since we don't know the
  // final response headers (see TRUSTED_USER_HEADER below) until
  // after the auth check completes.
  let cookiesToApply: { name: string; value: string; options: CookieOptionsWithName }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptionsWithName }[]) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          cookiesToApply = cookiesToSet;
        },
      },
    }
  );

  // Builds the one, final response for this request: carries the
  // (possibly refreshed) session cookies and the request headers
  // downstream code reads — including TRUSTED_USER_HEADER once we
  // know the verified user id.
  function buildResponse() {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    cookiesToApply.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
    return res;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;
  const isTopicsPath = pathname === "/topics" || pathname.startsWith("/topics/");

  if (isPublicPath(pathname) || isTopicsPath || pathname.startsWith("/_next")) {
    return buildResponse();
  }

  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // This ID is verified — the JWT check above just confirmed it via
  // Supabase Auth. Every downstream layout/API route reached from here
  // can trust it via `getCurrentAppUser()` instead of independently
  // re-verifying the same session (see lib/roles.ts) — that redundant
  // re-check (one `auth.getUser()` network round-trip per layer, times
  // however many layers a single page load touches) was the dominant
  // cost behind the site feeling slow everywhere; see changelog.md.
  requestHeaders.set(TRUSTED_USER_HEADER, user.id);

  // Role + approval status live in `users`, not in the session token —
  // service-role key bypasses RLS, same client used by the API routes.
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: profile } = await admin
    .from("users")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "approved") {
    if (pathname === "/pending-approval") return buildResponse();
    return NextResponse.redirect(new URL("/pending-approval", req.url));
  }

  if (pathname.startsWith("/admin") && profile.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  if (
    pathname.startsWith("/teacher") &&
    profile.role !== "teacher" &&
    profile.role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return buildResponse();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip)).*)",
  ],
};
