// Next 16 calls this file "proxy" (it replaced middleware.ts). It routes / to /ar and keeps the locale prefix on every page.
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

// A removed doctor profile answers 410 Gone (task 2.2, screen 17): the page renders MissingPage variant="removed", but a page
// can only choose 404, so the status is set here. Prototype: ?state=removed on /doctors/[id]; production reads the removed flag.
const PROFILE = new RegExp(`^/(${routing.locales.join("|")})/doctors/[^/]+/?$`);

export default function proxy(request: NextRequest) {
  const response = intl(request);
  const { pathname, searchParams } = request.nextUrl;
  if (PROFILE.test(pathname) && searchParams.get("state") === "removed") {
    return new NextResponse(response.body, { status: 410, headers: response.headers });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
