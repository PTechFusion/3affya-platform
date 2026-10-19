// The inbox list (screen 32): the next visit large, then rows grouped as new requests, upcoming and past. A row is the patient's
// first name, the date and time in the doctor's zone (zone named, rule P6), the status and Join. The whole row opens the detail
// through one stretched link; Join is its own sibling link above it, so no interactive element is nested.
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge, ChevronNext, LinkButton, Surface } from "@/components/ui";
import { formatNumber, formatSlotDay, formatTime, formatTimeInZone, formatZone, type Locale } from "@/lib/format";
import { inboxHref, patientName, statusTone, type InboxEntry, type InboxGroups } from "./inbox";
import { When, nowrap } from "./When";

const SECTIONS = ["requests", "upcoming", "past"] as const;

/** The external meeting link the professional supplied (handoff: no hosted video). */
const external = { target: "_blank", rel: "noopener noreferrer" } as const;

export async function NextVisit({ entry: e, locale, tz }: { entry: InboxEntry; locale: Locale; tz: string | undefined }) {
  const t = await getTranslations("inbox");
  const zone = tz ?? e.doctorTimeZone;
  const name = patientName(e, locale);
  return (
    <section aria-labelledby="next-visit">
      <Surface>
        <h2 id="next-visit" className="text-sm font-semibold text-lagoon-800">
          {t("next.title")}
        </h2>
        <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-ink-900">{formatSlotDay(e.startsAt, zone, locale)}</p>
            <p className="flex flex-wrap items-baseline gap-x-3">
              <span className="tabular text-4xl font-bold leading-tight text-sea-900">{formatTime(e.startsAt, zone, locale)}</span>
              <span className="ltr-run text-sm font-medium text-ink-500">{formatZone(e.startsAt, zone)}</span>
            </p>
            <p className="mt-3 text-xl font-bold text-ink-900">
              {name}
              <span className="text-base font-normal text-ink-700">
                {" · "}
                {t(`ageGroup.${e.ageGroup}`)} · {t(`visitType.${e.visitType}`)}
              </span>
            </p>
            <p className="mt-1 text-sm text-ink-700">
              {t.rich("next.patientTime", {
                day: formatSlotDay(e.startsAt, e.patientTimeZone, locale),
                time: formatTimeInZone(e.startsAt, e.patientTimeZone, locale),
                nowrap,
              })}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:shrink-0 sm:flex-row">
            {e.joinUrl ? (
              <LinkButton href={e.joinUrl} {...external} size="lg">
                {t(e.visitType === "phone" ? "detail.joinPhoneButton" : "detail.joinButton")}
              </LinkButton>
            ) : null}
            <LinkButton href={inboxHref(e.id, tz)} variant="secondary" size="lg">
              {t("next.details")}
            </LinkButton>
          </div>
        </div>
      </Surface>
    </section>
  );
}

export async function InboxSections({
  groups,
  locale,
  tz,
  currentId,
}: {
  groups: InboxGroups;
  locale: Locale;
  tz: string | undefined;
  currentId?: string;
}) {
  const t = await getTranslations("inbox");
  return (
    <div className="flex flex-col gap-6">
      {SECTIONS.filter((key) => groups[key].length > 0).map((key) => (
        <section key={key} aria-labelledby={`inbox-${key}`}>
          <h2 id={`inbox-${key}`} className="mb-3 flex items-center gap-2 text-lg font-bold text-sea-900">
            {t(`sections.${key}`)}
            <Badge tone="pending">
              <span className="tabular">{formatNumber(groups[key].length, locale)}</span>
            </Badge>
          </h2>
          <Surface>
            <ul className="@container -my-3 divide-y divide-sand-200">
              {groups[key].map((e) => (
                <Row key={e.id} entry={e} locale={locale} tz={tz} current={e.id === currentId} t={t} />
              ))}
            </ul>
          </Surface>
        </section>
      ))}
    </div>
  );
}

function Row({
  entry: e,
  locale,
  tz,
  current,
  t,
}: {
  entry: InboxEntry;
  locale: Locale;
  tz: string | undefined;
  current: boolean;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const name = patientName(e, locale);
  const join = e.inbox === "upcoming" ? e.joinUrl : null;
  return (
    <li
      className={[
        "relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3 @lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_6rem]",
        current ? "-mx-3 rounded-[var(--radius-field)] bg-sea-100 px-3" : "",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
        <Link
          href={inboxHref(e.id, tz)}
          aria-current={current ? "page" : undefined}
          className="font-semibold text-sea-900 underline-offset-2 after:absolute after:inset-0 after:rounded-[var(--radius-field)] hover:underline"
        >
          {name}
        </Link>
        <Badge tone={statusTone[e.inbox]}>{t(`status.${e.inbox}`)}</Badge>
      </div>
      <p className="col-span-2 text-sm text-ink-700 @lg:col-span-1">
        <When instant={e.startsAt} timeZone={tz ?? e.doctorTimeZone} locale={locale} />
      </p>
      <div className="col-start-2 row-start-1 flex justify-end @lg:col-start-3">
        {join ? (
          <LinkButton href={join} {...external} aria-label={t("joinLabel", { name })} className="relative z-10">
            {t("join")}
          </LinkButton>
        ) : (
          <ChevronNext className="size-4 text-sea-700" />
        )}
      </div>
    </li>
  );
}
