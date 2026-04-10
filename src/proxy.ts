// Next.js 16 renamed `middleware.ts` to `proxy.ts`.
// NextAuth v5 ships an `auth` export that doubles as a proxy.
export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    // Run on every page route except Next.js internals, NextAuth API,
    // static assets, and the public /login page.
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
