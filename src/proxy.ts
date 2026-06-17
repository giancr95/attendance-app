// Next.js 16 renamed `middleware.ts` to `proxy.ts`.
// NextAuth v5 ships an `auth` export that doubles as a proxy.
export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    // Run on every page route except:
    //  - NextAuth API routes
    //  - the /api/sync endpoint (token-protected, called by cron)
    //  - the /api/report/* endpoints (token-protected, called by cron)
    //  - Next.js internals + static assets
    //  - the public /login page
    //  - the /logout endpoint (clears the session cookie itself)
    "/((?!api/auth|api/sync|api/report|_next/static|_next/image|favicon.ico|login|logout).*)",
  ],
};
