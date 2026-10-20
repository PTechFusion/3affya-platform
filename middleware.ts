// Locale routing: / goes to /ar and every page keeps its locale prefix. Kept as the deprecated "middleware" convention on purpose:
// Next 16 "proxy" runs on Node and Netlify cannot package it yet (opennextjs-netlify issue 3575); "middleware" builds for the edge
// runtime, which Netlify and Vercel both run. Switch back to proxy.ts once that issue is closed.
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import removals from "./data/sample/removals.json";

const intl = createMiddleware(routing);

// A removed doctor profile answers 410 Gone (task 2.2, screen 17): the page renders MissingPage variant="removed", but a page
// can only choose 404, so the status is set here. Prototype: ?state=removed on /doctors/[id], or a removal confirmed on screen
// 41 (data/sample/removals.json); production reads the removed flag.
const PROFILE = new RegExp(`^/(${routing.locales.join("|")})/doctors/([^/]+)/?$`);
const REMOVED = new Set(removals.requests.filter((r) => r.status === "confirmed").map((r) => r.doctorId));

// Prototype gate (task 1.11): HTTP basic auth while the build is under review. SITE_USERS is "user:password,user:password"
// in the host's env; unset (local dev) means no gate. Read per request: Netlify's edge runtime fills env at invocation, not at
// module load. Remove before launch.
declare const Netlify: { env: { get(key: string): string | undefined } } | undefined;

function siteUsers() {
  const raw = process.env.SITE_USERS || (typeof Netlify === "undefined" ? undefined : Netlify.env.get("SITE_USERS")) || "";
  return new Set(raw.split(",").map((u) => u.trim()).filter(Boolean));
}

function allowed(request: NextRequest) {
  const users = siteUsers();
  if (users.size === 0) return true;
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  try {
    return users.has(atob(header.slice(6)));
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  if (!allowed(request)) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="3affya preview", charset="UTF-8"' },
    });
  }
  const response = intl(request);
  const { pathname, searchParams } = request.nextUrl;
  const profile = PROFILE.exec(pathname);
  if (profile && (searchParams.get("state") === "removed" || REMOVED.has(profile[2] ?? ""))) {
    return new NextResponse(response.body, { status: 410, headers: response.headers });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
