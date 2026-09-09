import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({ request: req });

  // Refreshes the Supabase Auth session cookie on every request — this
  // is what keeps someone signed in across page loads. Standard
  // @supabase/ssr middleware pattern for the Next.js App Router.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptionsWithName }[]
        ) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;
  const isTopicsPath = pathname === "/topics" || pathname.startsWith("/topics/");

  if (isPublicPath(pathname) || isTopicsPath || pathname.startsWith("/_next")) {
    return response;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

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
    if (pathname === "/pending-approval") return response;
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

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip)).*)",
  ],
};
