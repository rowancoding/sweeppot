import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { geolocation } from "@vercel/functions";

const BLOCKED_COUNTRIES = new Set(["US", "IE"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Geo-blocking — runs before auth checks
  if (pathname !== "/blocked") {
    const { country, region } = geolocation(request);
    const isNorthernIreland = country === "GB" && region === "GB-NIR";
    if (country && (BLOCKED_COUNTRIES.has(country) || isNorthernIreland)) {
      const url = request.nextUrl.clone();
      url.pathname = "/blocked";
      return NextResponse.redirect(url);
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — must not run any code between createServerClient and getUser
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Routes that don't require authentication
  const isAuthRoute   = pathname.startsWith("/auth/login") || pathname.startsWith("/auth/signup") || pathname.startsWith("/auth/forgot-password") || pathname.startsWith("/auth/reset-password");
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/generator" ||
    pathname === "/world-cup-sweepstake-generator" ||
    pathname === "/football-sweepstake-generator" ||
    pathname === "/terms" ||
    pathname === "/blocked" ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/api/stripe/") ||
    pathname.startsWith("/api/football-data") ||
    pathname.startsWith("/auth/confirm");

  // Unauthenticated: redirect to /auth/login (except on auth/public routes)
  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Authenticated: redirect away from auth routes to dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
