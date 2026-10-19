// What checkout asks that the picker did not (rules F10, F2): where the patient will be during the visit, a phone number the
// doctor can call, and the two agreements (P5, P9). Pure, shared by the checkout form and the payment action.

/** Where the patient may be during the visit. The six Gulf countries first (they are who 3affya serves), then "other". */
export const LOCATIONS = ["SA", "AE", "KW", "QA", "BH", "OM", "other"] as const;
export type Location = (typeof LOCATIONS)[number];

/**
 * Phone country codes, Gulf first (rule F10), each with the digits a national number has after the code. The UAE allows 8
 * (landline) or 9 (mobile). GB and US cover patients who travel; anything else is a follow-up question for Dr Ayman.
 */
export const DIAL_CODES = [
  { country: "SA", code: "+966", digits: [9] },
  { country: "AE", code: "+971", digits: [8, 9] },
  { country: "KW", code: "+965", digits: [8] },
  { country: "QA", code: "+974", digits: [8] },
  { country: "BH", code: "+973", digits: [8] },
  { country: "OM", code: "+968", digits: [8] },
  { country: "GB", code: "+44", digits: [10] },
  { country: "US", code: "+1", digits: [10] },
] as const;
export type DialCountry = (typeof DIAL_CODES)[number]["country"];

export type Details = {
  location: Location | "";
  phoneCountry: DialCountry;
  phone: string;
  telehealth: boolean;
  cancellation: boolean;
};
export type DetailField = "location" | "phone" | "telehealth" | "cancellation";
export type DetailError = "required" | "digits" | "length";
export type DetailErrors = Partial<Record<DetailField, DetailError>>;
export const DETAIL_FIELDS: readonly DetailField[] = ["location", "phone", "telehealth", "cancellation"];

export const dialFor = (country: string) => DIAL_CODES.find((d) => d.country === country) ?? DIAL_CODES[0];

/** The national number as typed, without spaces, dashes or the one leading trunk zero ("050 123 4567" is "501234567"). */
export function nationalDigits(raw: string): string {
  return raw.replace(/[\s\-().]/g, "").replace(/^0/, "");
}

export function validatePhone(raw: string, country: string): DetailError | undefined {
  const digits = nationalDigits(raw);
  if (!digits) return "required";
  if (!/^\d+$/.test(digits)) return "digits";
  return (dialFor(country).digits as readonly number[]).includes(digits.length) ? undefined : "length";
}

export function validateDetails(d: Details): DetailErrors {
  const e: DetailErrors = {};
  if (!d.location || !(LOCATIONS as readonly string[]).includes(d.location)) e.location = "required";
  const phone = validatePhone(d.phone, d.phoneCountry);
  if (phone) e.phone = phone;
  if (!d.telehealth) e.telehealth = "required";
  if (!d.cancellation) e.cancellation = "required";
  return e;
}

/** Details out of an untrusted object (the payment action's input). */
export function detailsFrom(src: Record<string, unknown>): Details {
  const location = typeof src.location === "string" && (LOCATIONS as readonly string[]).includes(src.location) ? (src.location as Location) : "";
  return {
    location,
    phoneCountry: dialFor(typeof src.phoneCountry === "string" ? src.phoneCountry : "SA").country,
    phone: typeof src.phone === "string" ? src.phone : "",
    telehealth: src.telehealth === true,
    cancellation: src.cancellation === true,
  };
}
