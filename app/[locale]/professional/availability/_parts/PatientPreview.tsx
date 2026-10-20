"use client";
// The patient's view of the doctor's hours (the hook): the coming week in the viewer's zone, the zone named once (rule P6),
// a no-DST note for the Gulf zone and the date the doctor's own clock changes, weekends shaded for the viewer's country and
// labelled in words, not by colour alone (P7, from business.weekend), Gregorian dates (N3). Recomputed from the model on every
// render, so a change in the grid shows here at once (L2). Times are shown, not offered: no slot links into booking here.
import { Badge, Field, Select, SlotTime } from "@/components/ui";
import { business } from "@/config/business";
import { formatClockRange, formatSlotDay, formatTime, formatZone } from "@/lib/format";
import { nextOffsetChange, slotRuns, slotsByViewerDay, type Weekday } from "@/lib/slots";
import { gulfTimeZones, weekendFor } from "@/lib/viewer";
import type { AvailabilityModel } from "../model";
import type { Labels } from "./labels";

/** The coming week, today first. */
export const PREVIEW_DAYS = 7;

export type PreviewViewer = { country: string; timeZone: string };

/** The viewer's city in the page language when the zone is the country's own; otherwise the city from the zone id. */
export function viewerCity(L: Labels, viewer: PreviewViewer): string {
  return gulfTimeZones[viewer.country] === viewer.timeZone ? L.t(`cities.${viewer.country}`) : L.city(viewer.timeZone);
}

export function PatientPreview({
  L,
  model,
  viewer,
  now,
  onCountry,
}: {
  L: Labels;
  model: AvailabilityModel;
  viewer: PreviewViewer;
  now: Date;
  onCountry: (country: string) => void;
}) {
  const { t, loc } = L;
  const weekend = weekendFor(viewer.country) as readonly Weekday[];
  const days = slotsByViewerDay(model, { timeZone: viewer.timeZone, weekend }, now, PREVIEW_DAYS, model.leadTimeHours);
  const city = viewerCity(L, viewer);
  const doctorCity = L.city(model.timeZone);
  const viewerShift = nextOffsetChange(viewer.timeZone, now);
  const doctorShift = nextOffsetChange(model.timeZone, now, business.bookingHorizonDays);
  const shiftHours = doctorShift ? Math.abs(doctorShift.deltaMinutes) / 60 : 0;
  // The zone line carries the no-DST note (layout pointer); the doctor's own clock change goes under the week.
  const zoneNote = viewerShift ? t("preview.bothDst", { city }) : t("preview.noDst", { city });
  const doctorShiftNote =
    doctorShift && !viewerShift
      ? t(doctorShift.deltaMinutes < 0 ? "preview.dstLater" : "preview.dstEarlier", {
          doctorCity,
          city,
          date: formatSlotDay(doctorShift.at, model.timeZone, loc),
          hours: shiftHours,
          hoursLabel: L.count(shiftHours),
        })
      : undefined;
  const [first, second] = weekend;
  const listJoin = loc === "ar" ? "، " : ", ";
  const countryId = "availability-preview-country";

  return (
    <div className="mt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-sea-900">{t("preview.title", { city })}</h3>
          <p className="text-sm text-ink-700">
            {t("preview.zoneLead")} <span className="ltr-run font-semibold text-ink-900">{formatZone(now, viewer.timeZone)}</span>
          </p>
          <p className="text-sm text-ink-700">{zoneNote}</p>
        </div>
        <div className="sm:w-64">
          <Field id={countryId} label={t("preview.country")}>
            <Select id={countryId} value={viewer.country} onChange={(e) => onCountry(e.target.value)}>
              {Object.keys(gulfTimeZones).map((c) => (
                <option key={c} value={c}>
                  {t(`countries.${c}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      <ol className="mt-4 flex flex-col gap-2">
        {days.map((day) => {
          const runs = slotRuns(day.slots, model.slotMinutes);
          const firstSlot = day.slots[0];
          return (
            <li
              key={day.key}
              className={[
                "rounded-[var(--radius-field)] border p-3",
                day.weekend ? "border-sand-300 bg-sand-100" : "border-sand-200 bg-white",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <h4 className="font-semibold text-ink-900">{formatSlotDay(day.start, viewer.timeZone, loc)}</h4>
                {day.weekend ? <Badge tone="pending">{t("preview.weekend")}</Badge> : null}
              </div>
              {firstSlot ? (
                <>
                  <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                    {day.slots.map((s) => (
                      <li key={s.getTime()}>
                        <SlotTime time={formatTime(s, viewer.timeZone, loc)} />
                      </li>
                    ))}
                  </ul>
                  {/* Rule P6: the doctor's own time is secondary, one line under the day. */}
                  <p className="mt-2 text-xs text-ink-500">
                    {t("preview.yourTime")} {runs.map((r) => formatClockRange(r.start, r.end, model.timeZone, loc)).join(listJoin)}{" "}
                    <span className="ltr-run">{formatZone(firstSlot, model.timeZone)}</span>
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-ink-500">{day.dayOff ? t("preview.dayOff") : t("preview.noTimes")}</p>
              )}
            </li>
          );
        })}
      </ol>
      {days.every((d) => d.slots.length === 0) ? <p className="mt-3 text-sm text-ink-700">{t("preview.empty")}</p> : null}

      {/* Under the week, so the times themselves stay near the top on phone. Each shaded day also says Weekend in words. */}
      <ul className="mt-4 flex flex-col gap-1 text-sm text-ink-700">
        {doctorShiftNote ? <li>{doctorShiftNote}</li> : null}
        {first && second ? (
          <li>{t("preview.weekendLegend", { country: t(`countriesIn.${viewer.country}`), first: L.day(first), second: L.day(second) })}</li>
        ) : null}
        <li>{t("preview.leadNote", { notice: L.hours(model.leadTimeHours) })}</li>
      </ul>
    </div>
  );
}
