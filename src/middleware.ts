import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/siteUrl";

// Coming soon mode - disabled for now (検収中)
const isComingSoonMode = false;

// Base URL for redirects (use AUTH_URL or request origin)
const getBaseUrl = (requestOrigin: string) => {
  return siteUrl(requestOrigin);
};

// Routes that require authentication
const protectedRoutes = [
  "/mypage",
  "/profile/edit",
  "/messages",
  "/settings",
];

// Routes that should redirect to mypage if already authenticated
const authRoutes = [
  "/login",
  "/register",
];

// Routes allowed during coming soon mode
const comingSoonAllowedRoutes = [
  "/coming-soon",
  "/privacy-policy",
  "/terms",
  "/contact",
  "/login",
  "/register",
  "/admin",
  "/mypage",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

// Routes that unverified email users can still access
const emailVerificationExemptRoutes = [
  "/mypage",
  "/profile/edit",
  "/settings",
  "/verify-email",
];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

  // Coming soon mode: redirect top page to /coming-soon
  if (isComingSoonMode) {
    const isAllowedRoute = comingSoonAllowedRoutes.some(route =>
      pathname.startsWith(route)
    );

    if (pathname === "/" || (!isAllowedRoute && !pathname.startsWith("/api"))) {
      const baseUrl = getBaseUrl(nextUrl.origin);
      return NextResponse.redirect(new URL("/coming-soon", baseUrl));
    }
  }

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  // Check if the route is an auth route
  const isAuthRoute = authRoutes.some(route =>
    pathname.startsWith(route)
  );

  const baseUrl = getBaseUrl(nextUrl.origin);

  // Redirect to login if trying to access protected route without auth
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to mypage if already logged in and trying to access auth routes
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/mypage", baseUrl));
  }

  // Email verification check for logged-in users
  if (isLoggedIn && isProtectedRoute) {
    const emailVerified = req.auth?.user?.emailVerified;
    const isExempt = emailVerificationExemptRoutes.some(route =>
      pathname.startsWith(route)
    );

    if (!emailVerified && !isExempt) {
      return NextResponse.redirect(new URL("/verify-email/pending", baseUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
