import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

// Edge-compatible NextAuth config (no database adapter)
const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }: { auth: any; request: { nextUrl: any } }) {
      const { pathname } = nextUrl;

      // Public routes that don't require authentication
      const publicRoutes = [
        "/login",
        "/register",
        "/privacy",
        "/terms",
        "/ping",
      ];

      // Allow access to public routes
      if (publicRoutes.some(route => pathname.startsWith(route))) {
        return true;
      }

      // Allow auth endpoints
      if (pathname.startsWith("/api/auth")) {
        return true;
      }

      // Allow static files and public assets
      if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico") ||
        pathname.startsWith("/sitemap.xml") ||
        pathname.startsWith("/robots.txt")
      ) {
        return true;
      }

      const isLoggedIn = !!auth?.user;

      // Redirect to login if not authenticated
      if (!isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      // Redirect logged-in users away from auth pages
      if (isLoggedIn && ["/login", "/register"].includes(pathname)) {
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
