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

/** The six Gulf countries patients book from, each with its one IANA zone. None of them observes DST (rule P6). */
export const gulfTimeZones: Readonly<Record<string, string>> = {
  SA: "Asia/Riyadh",
  AE: "Asia/Dubai",
  KW: "Asia/Kuwait",
  QA: "Asia/Qatar",
  BH: "Asia/Bahrain",
  OM: "Asia/Muscat",
};

/** Weekend days for a country (rule P7: from business.weekend, never hard-coded). Falls back to the Saudi weekend. */
export function weekendFor(country: string): readonly string[] {
  return business.weekend[country] ?? business.weekend.SA ?? [];
}
