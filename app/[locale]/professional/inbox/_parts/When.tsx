// "Tue, Oct 20 · 11:00 AM Chicago (GMT-5)": a visit's day and time with the zone named (rule P6). The clock time and the
// zone each stay on one line (the zone as its own LTR run, rule R3), so a narrow row never breaks "GMT-" from "5".
import { formatSlotDay, formatTime, formatZone, type Locale } from "@/lib/format";

export function When({ instant, timeZone, locale }: { instant: Date; timeZone: string; locale: Locale }) {
  return (
    <>
      {formatSlotDay(instant, timeZone, locale)} · <span className="whitespace-nowrap">{formatTime(instant, timeZone, locale)}</span>{" "}
      <span className="ltr-run">{formatZone(instant, timeZone)}</span>
    </>
  );
}

/** Tag for rich messages: keeps a time and its zone on one line. */
export const nowrap = (chunks: React.ReactNode) => <span className="whitespace-nowrap">{chunks}</span>;
