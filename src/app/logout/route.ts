// Dedicated logout endpoint.
//
// Why a plain GET route instead of the usual signOut() in a server action:
// behind the Coolify/Traefik proxy NextAuth kept building auth URLs from the
// container's internal host (0.0.0.0:3000), which broke the client signOut and
// made the menu logout fail. This route is the most robust possible logout:
// the menu links here with a normal <a>, the browser does a full navigation,
// we clear the Auth.js JWT cookie and 303 back to /login using the PUBLIC host
// from the forwarded headers (never the internal bind address).
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Auth.js v5 default cookie names (this app uses JWT sessions, no DB session).
// Over HTTPS the names are __Secure-/__Host- prefixed. We clear every variant
// (and the .0/.1 chunks NextAuth uses when a cookie is large) to be safe.
const COOKIE_NAMES = [
  "authjs.session-token",
  "authjs.session-token.0",
  "authjs.session-token.1",
  "__Secure-authjs.session-token",
  "__Secure-authjs.session-token.0",
  "__Secure-authjs.session-token.1",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
];

export async function GET(request: Request) {
  // Build the redirect target from the PUBLIC host (forwarded by the proxy),
  // not request.url which may be the internal 0.0.0.0:3000 bind address.
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "rrhh-lcdp.mecacr.work";

  const res = NextResponse.redirect(`${proto}://${host}/login`, { status: 303 });
  for (const name of COOKIE_NAMES) {
    res.cookies.set(name, "", { path: "/", expires: new Date(0), maxAge: 0 });
  }
  return res;
}
