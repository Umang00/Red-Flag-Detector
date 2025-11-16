import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/",
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
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
      if (publicRoutes.some((route) => pathname.startsWith(route))) {
        return true;
      }

      // Allow auth endpoints
      if (pathname.startsWith("/api/auth")) {
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
