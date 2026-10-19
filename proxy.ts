// Next 16 calls this file "proxy" (it replaced middleware.ts). It routes / to /ar and keeps the locale prefix on every page.
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
