// Viewer context for public pages. The prototype takes country and time zone from query params with Saudi defaults;
// production reads them from the request (geo header) and the signed-in patient's settings.
import { business } from "@/config/business";

export type Viewer = { country: string; timeZone: string };

export function viewerFrom(params: Record<string, string | string[] | undefined>): Viewer {
  const country = typeof params.country === "string" && params.country.length === 2 ? params.country.toUpperCase() : "SA";
  const timeZone = typeof params.tz === "string" && params.tz.includes("/") ? params.tz : business.defaultTimeZone;
  return { country, timeZone };
}

/** Local emergency number for the not-for-emergencies line (rule H14). Falls back to the Saudi number. */
export function emergencyNumberFor(country: string): string {
  const numbers = business.emergencyNumbers;
  return numbers[country] ?? numbers.SA ?? "";
}
