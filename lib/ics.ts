// One calendar event, written two ways: an .ics file (RFC 5545) for Apple Calendar, Outlook and most Android calendar apps, and
// a Google Calendar link. The booking confirmation page and the confirmation emails (task 3.3) send the same event. Instants
// are written in UTC (the Z form), so every calendar shows the visit at the right local time in any zone (rule P6). Pure: no
// I/O, safe on both sides.

export type CalendarEvent = {
  /** Stable across downloads, so adding the same booking twice updates one entry instead of making two. */
  uid: string;
  start: Date;
  end: Date;
  title: string;
  /** Plain text; line breaks are kept. */
  description: string;
  /** A meeting link or a place. */
  location?: string;
  url?: string;
};

/** 20261024T150000Z */
const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** TEXT values: backslash, semicolon and comma escaped, line breaks as \n (RFC 5545 3.3.11). */
const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines longer than 75 octets fold onto continuation lines that start with a space (RFC 5545 3.1), never inside a character,
 *  so Arabic text (two bytes a letter) survives. */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // a continuation line spends one octet on its leading space
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function toIcs(event: CalendarEvent, now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//3affya//Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(event.start)}`,
    `DTEND:${utcStamp(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** The same event as a Google Calendar "add event" link. */
export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${utcStamp(event.start)}/${utcStamp(event.end)}`,
    details: event.description,
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
