// The time zones a patient can pick in Settings (screen 28): the six Gulf countries first (rule P6, from lib/viewer
// gulfTimeZones, none with DST), then a short list of places Gulf patients live in or travel to. Each zone is named by its
// city and country in the page language (settings.timeZone.places.*), never by the Latin IANA id.
import { gulfTimeZones } from "@/lib/viewer";

export type ZoneChoice = { key: string; timeZone: string };

export const GULF_ZONES: ZoneChoice[] = Object.entries(gulfTimeZones).map(([key, timeZone]) => ({ key, timeZone }));

export const OTHER_ZONES: ZoneChoice[] = [
  { key: "cairo", timeZone: "Africa/Cairo" },
  { key: "amman", timeZone: "Asia/Amman" },
  { key: "beirut", timeZone: "Asia/Beirut" },
  { key: "baghdad", timeZone: "Asia/Baghdad" },
  { key: "istanbul", timeZone: "Europe/Istanbul" },
  { key: "london", timeZone: "Europe/London" },
  { key: "newYork", timeZone: "America/New_York" },
  { key: "chicago", timeZone: "America/Chicago" },
  { key: "losAngeles", timeZone: "America/Los_Angeles" },
];

export const SETTINGS_ZONES: ZoneChoice[] = [...GULF_ZONES, ...OTHER_ZONES];

export const isSettingsZone = (timeZone: string) => SETTINGS_ZONES.some((z) => z.timeZone === timeZone);
