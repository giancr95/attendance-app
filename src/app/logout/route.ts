// Dedicated logout endpoint (linked from the user menu with a plain <a>).
//
// Why this and not the usual signOut(): behind the Coolify/Traefik proxy the
// client next-auth/react signOut navigated to the internal host (0.0.0.0:3000)
// → "page couldn't load", and a server-action redirect from a menu click was
// unreliable. A plain GET route + native navigation is robust.
//
// The session is a stateless JWT, so logging out == deleting the cookie. The
// FIRST attempt failed because Auth.js stores it as `__Secure-authjs.session-
// token`, and a __Secure-/__Host- prefixed cookie can ONLY be set/deleted when
// the Set-Cookie also carries `Secure` — without it the browser silently
// rejects the deletion and the session survives. We now read the exact cookie
// names off the request and clear each with matching attributes.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthCookie(name: string) {
  return (
    name.includes("authjs.session-token") ||
    name.includes("authjs.csrf-token") ||
    name.includes("authjs.callback-url")
  );
}

export async function GET(request: Request) {
  // Build the redirect from the PUBLIC host (forwarded by the proxy), never
  // request.url which can be the internal 0.0.0.0:3000 bind address.
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "rrhh-lcdp.mecacr.work";

  const res = NextResponse.redirect(`${proto}://${host}/login`, { status: 303 });

  // Delete exactly the auth cookies the browser actually sent, with the
  // attributes required for the browser to accept the deletion.
  const cookieHeader = request.headers.get("cookie") ?? "";
  const names = new Set(
    cookieHeader
      .split(";")
      .map((c) => c.split("=")[0]?.trim())
      .filter((n): n is string => !!n && isAuthCookie(n))
  );
  // Always include the standard JWT session cookie names as a fallback, in
  // case the header parsing misses them.
  names.add("__Secure-authjs.session-token");
  names.add("authjs.session-token");

  for (const name of names) {
    res.cookies.set(name, "", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      // __Secure-/__Host- prefixed cookies REQUIRE Secure to be (un)set.
      secure: name.startsWith("__Secure-") || name.startsWith("__Host-"),
      expires: new Date(0),
      maxAge: 0,
    });
  }
  return res;
}
