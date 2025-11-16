import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

const guestRegex = /^guest-\d+$/;

// Edge-compatible NextAuth config (no database adapter)
const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;

      // Playwright ping endpoint
      if (pathname.startsWith("/ping")) {
        return true;
      }

      // Allow auth endpoints
      if (pathname.startsWith("/api/auth")) {
        return true;
      }

      const isLoggedIn = !!auth?.user;

      // Redirect to guest login if not logged in
      if (!isLoggedIn) {
        const redirectUrl = encodeURIComponent(nextUrl.toString());
        return Response.redirect(new URL(`/api/auth/guest?redirectUrl=${redirectUrl}`, nextUrl));
      }

      const isGuest = guestRegex.test(auth?.user?.email ?? "");

      // Redirect logged-in non-guest users away from auth pages
      if (isLoggedIn && !isGuest && ["/login", "/register"].includes(pathname)) {
        return Response.redirect(new URL("/", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/login",
    "/register",

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
