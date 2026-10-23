// lib/ics.ts: one calendar event as an RFC 5545 file and a Google Calendar link. TEXT escaping, UTC stamps, CRLF and folding
// at 75 octets without splitting a character (Arabic is two bytes a letter).
import { describe, expect, it } from "vitest";
import { googleCalendarUrl, toIcs, type CalendarEvent } from "@/lib/ics";
import { at } from "./helpers";

const event: CalendarEvent = {
  uid: "bk_004@3affya.com",
  start: at("2026-11-01T15:00:00Z"),
  end: at("2026-11-01T15:30:00Z"),
  title: "Video visit with Dr Omar Khalil",
  description: "Join from your browser: https://meet.example.com/omar-khalil\nNot for emergencies; call 997, or 911.",
  location: "https://meet.example.com/omar-khalil",
  url: "https://3affya.com/en/patient/bookings/bk_004",
};
const NOW = at("2026-10-21T09:15:30Z");

/** Unfold continuation lines (CRLF + space) back into logical lines. */
const unfold = (ics: string) => ics.replace(/\r\n /g, "").split("\r\n");

describe("toIcs", () => {
  const ics = toIcs(event, NOW);
  const lines = unfold(ics);

  it("is one VEVENT in a VCALENDAR with CRLF line ends and a final CRLF", () => {
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(lines).toContain("BEGIN:VEVENT");
    expect(lines.at(-2)).toBe("END:VCALENDAR");
  });

  it("writes instants in UTC with the Z form and stamps with the injected now", () => {
    expect(lines).toContain("DTSTART:20261101T150000Z");
    expect(lines).toContain("DTEND:20261101T153000Z");
    expect(lines).toContain("DTSTAMP:20261021T091530Z");
    expect(lines).toContain("UID:bk_004@3affya.com");
  });

  it("escapes backslash, semicolon and comma, and writes line breaks as \\n", () => {
    const d = lines.find((l) => l.startsWith("DESCRIPTION:"))!;
    expect(d).toBe("DESCRIPTION:Join from your browser: https://meet.example.com/omar-khalil\\nNot for emergencies\\; call 997\\, or 911.");
    const tricky = unfold(toIcs({ ...event, title: "a\\b;c,d\r\ne" }, NOW)).find((l) => l.startsWith("SUMMARY:"));
    expect(tricky).toBe("SUMMARY:a\\\\b\\;c\\,d\\ne");
  });

  it("leaves the URL unescaped and drops optional fields that are absent", () => {
    expect(lines).toContain("URL:https://3affya.com/en/patient/bookings/bk_004");
    const bare = unfold(toIcs({ uid: "x", start: event.start, end: event.end, title: "t", description: "d" }, NOW));
    expect(bare.some((l) => l.startsWith("LOCATION:"))).toBe(false);
    expect(bare.some((l) => l.startsWith("URL:"))).toBe(false);
  });

  it("folds long lines at 75 octets and never inside an Arabic letter", () => {
    const arabic = { ...event, title: "زيارة فيديو مع د. عمر خليل، أخصائي الأنف والأذن والحنجرة، من المتصفح" };
    const raw = toIcs(arabic, NOW);
    const encoder = new TextEncoder();
    const physical = raw.split("\r\n").filter(Boolean);
    for (const line of physical) expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    expect(physical.some((l) => l.startsWith(" "))).toBe(true); // it did fold
    expect(raw).not.toContain("�");
    expect(unfold(raw)).toContain(`SUMMARY:${arabic.title.replace(/,/g, "\\,")}`);
  });
});

describe("googleCalendarUrl", () => {
  it("carries the same event with UTC dates", () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe(event.title);
    expect(url.searchParams.get("dates")).toBe("20261101T150000Z/20261101T153000Z");
    expect(url.searchParams.get("details")).toBe(event.description);
    expect(url.searchParams.get("location")).toBe(event.location);
  });

  it("omits the location when there is none", () => {
    const url = new URL(googleCalendarUrl({ ...event, location: undefined }));
    expect(url.searchParams.has("location")).toBe(false);
  });
});
