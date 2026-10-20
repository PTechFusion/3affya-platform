// Server parts of screen 46: the heading, the counsel gate notice, the funnel tiles, the search and filter form with its
// applied-filter chips, the list of doctors to invite and the "how invites work" reference. The skeleton reuses the frame.
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DoctorCard } from "@/components/brand/DoctorCard";
import {
  Button,
  Chip,
  CloseIcon,
  Disclosure,
  Field,
  Input,
  Notice,
  SearchIcon,
  Select,
  Surface,
} from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { business, outreach } from "@/config/business";
import { formatDate, formatNumber, formatPercent, type Locale } from "@/lib/format";
import { toDoctorCardData, type OutreachInvite, type SampleDoctor } from "@/lib/sample";
import { outreachHref, type FunnelCounts, type OutreachFilter, type OutreachQuery } from "./outreach";

export const GATE_ID = "outreach-gate";

export function OutreachHeader() {
  const t = useTranslations("adminOutreach");
  return (
    <header>
      <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{t("title")}</h1>
      <p className="mt-1.5 max-w-2xl text-ink-700">{t("lead")}</p>
    </header>
  );
}

/** The counsel gate (brief: send actions stay disabled until counsel clears sending). Gone once outreach.sendingCleared. */
export function GateNotice() {
  const t = useTranslations("adminOutreach");
  if (outreach.sendingCleared) return null;
  return <Notice id={GATE_ID} tone="warning" title={t("gate.title")} body={t("gate.body")} />;
}

const TILES: Array<{ key: keyof Pick<FunnelCounts, "sent" | "opened" | "claimed" | "expired">; filter?: OutreachFilter }> = [
  { key: "sent" },
  { key: "opened", filter: "opened" },
  { key: "claimed", filter: "claimed" },
  { key: "expired", filter: "expired" },
];

/** The tile frame, shared with the skeleton: real label on top, the number, one line under it. */
export function Tile({ label, value, note, current }: { label: string; value: ReactNode; note: ReactNode; current?: boolean }) {
  return (
    <Surface className={["h-full transition-colors hover:border-sea-500", current ? "ring-2 ring-sea-700" : ""].join(" ")}>
      {/* divs, not p: the skeleton passes a Skeleton (a div) as value and note, and a div inside a p breaks hydration. */}
      <div className="text-sm font-semibold text-ink-700">{label}</div>
      <div className="tabular mt-0.5 text-3xl font-bold leading-tight text-sea-900">{value}</div>
      <div className="mt-0.5 text-sm text-ink-700">{note}</div>
    </Surface>
  );
}

/**
 * Funnel tiles (layout call): sent, opened, claimed, expired, each a link that filters the list to exactly the invites it
 * counts, with its share of sent. Bounced and revoked sit under them as two small links, shown only when there are any.
 */
export function FunnelTiles({ counts, query, showSide = true }: { counts: FunnelCounts; query: OutreachQuery; showSide?: boolean }) {
  const t = useTranslations("adminOutreach");
  const loc = useLocale() as Locale;
  const share = (n: number) => t("funnel.share", { pct: formatPercent(counts.sent ? Math.round((n / counts.sent) * 100) : 0, loc, 0) });
  const base = { tz: query.tz, q: query.q, specialty: query.specialty };
  const side = (["bounced", "revoked"] as const).filter((k) => counts[k] > 0);
  return (
    <nav aria-label={t("funnel.label")} className="flex flex-col gap-2.5">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TILES.map(({ key, filter }) => {
          const current = query.tab === "sent" && query.status === filter;
          return (
            <li key={key}>
              <Link
                href={outreachHref({ ...base, status: filter })}
                scroll={false}
                aria-current={current ? "true" : undefined}
                className="block h-full rounded-[var(--radius-card)]"
              >
                <Tile
                  label={t(`funnel.${key}`)}
                  value={formatNumber(counts[key], loc)}
                  note={key === "sent" ? t("funnel.sentNote") : share(counts[key])}
                  current={current}
                />
              </Link>
            </li>
          );
        })}
      </ul>
      {showSide && side.length ? (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {side.map((k) => (
            <Link
              key={k}
              href={outreachHref({ ...base, status: k })}
              scroll={false}
              aria-current={query.tab === "sent" && query.status === k ? "true" : undefined}
              className={[
                "inline-flex min-h-8 items-center font-semibold underline-offset-2 hover:underline aria-[current=true]:underline",
                k === "bounced" ? "text-danger" : "text-ink-700",
              ].join(" ")}
            >
              {t(`funnel.${k}`, { countLabel: formatNumber(counts[k], loc) })}
            </Link>
          ))}
        </p>
      ) : null}
    </nav>
  );
}

export type SpecialtyOption = { slug: string; label: string };

/** Specialty options for the doctors a list can show, in the page language, sorted for that language. */
export function specialtyOptions(doctors: SampleDoctor[], loc: Locale): SpecialtyOption[] {
  const seen = new Map<string, string>();
  for (const d of doctors) seen.set(d.specialty, loc === "ar" ? d.specialtyAr : d.specialtyEn);
  return [...seen].map(([slug, label]) => ({ slug, label })).sort((a, b) => a.label.localeCompare(b.label, loc));
}

/**
 * Search stays visible; the specialty filter is one level down (rule A5), opened when it is in use. A plain GET form, so it
 * works before JavaScript and every filtered view has its URL (rule S3). Production logs which filters are used and how
 * often (no search text), so the next pass can move a filter up or down (A5).
 */
export function Filters({ query, specialties }: { query: OutreachQuery; specialties: SpecialtyOption[] }) {
  const t = useTranslations("adminOutreach");
  const loc = useLocale() as Locale;
  const moreOn = query.specialty ? 1 : 0;
  return (
    <form method="get" role="search" aria-label={t("filters.label")} className="flex flex-col">
      {query.tab === "invite" ? <input type="hidden" name="tab" value="invite" /> : null}
      {query.status ? <input type="hidden" name="status" value={query.status} /> : null}
      {query.tz ? <input type="hidden" name="tz" value={query.tz} /> : null}
      <Field id="outreach-q" label={query.tab === "sent" ? t("filters.searchSent") : t("filters.searchInvite")}>
        <div className="flex gap-2">
          <Input
            id="outreach-q"
            name="q"
            type="search"
            defaultValue={query.q}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
          />
          <Button type="submit" variant="secondary" className="shrink-0">
            <SearchIcon />
            <span className="sr-only sm:not-sr-only">{t("filters.submit")}</span>
          </Button>
        </div>
      </Field>
      <Disclosure summary={moreOn ? t("filters.moreActive", { countLabel: formatNumber(moreOn, loc) }) : t("filters.more")} open={Boolean(moreOn)}>
        <div className="flex flex-col gap-3 pb-1 sm:flex-row sm:items-end">
          <div className="sm:w-80">
            <Field id="outreach-specialty" label={t("filters.specialty")}>
              <Select id="outreach-specialty" name="specialty" defaultValue={query.specialty ?? ""}>
                <option value="">{t("filters.anySpecialty")}</option>
                {specialties.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button type="submit" variant="secondary">
            {t("filters.apply")}
          </Button>
        </div>
      </Disclosure>
    </form>
  );
}

/** What is filtering the list right now, each removable, plus Clear all (rule S12 pattern from search). */
export function AppliedFilters({ query, specialties }: { query: OutreachQuery; specialties: SpecialtyOption[] }) {
  const t = useTranslations("adminOutreach");
  const tc = useTranslations("common");
  const items: Array<{ label: string; href: string }> = [];
  const keep = { tab: query.tab, tz: query.tz, status: query.status, q: query.q, specialty: query.specialty };
  if (query.tab === "sent" && query.status) items.push({ label: t(`filters.status.${query.status}`), href: outreachHref({ ...keep, status: undefined }) });
  if (query.q) items.push({ label: t("filters.query", { q: query.q }), href: outreachHref({ ...keep, q: undefined }) });
  const specialty = specialties.find((s) => s.slug === query.specialty);
  if (specialty) items.push({ label: specialty.label, href: outreachHref({ ...keep, specialty: undefined }) });
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ul aria-label={t("filters.applied")} className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} scroll={false} aria-label={t("filters.remove", { label: item.label })} className="block rounded-[var(--radius-tag)]">
              <Chip tone="lagoon">
                <span dir="auto">{item.label}</span>
                <CloseIcon className="ms-2 size-3.5" />
              </Chip>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={outreachHref({ tab: query.tab, tz: query.tz })}
        scroll={false}
        className="inline-flex min-h-10 items-center px-2 text-sm font-semibold text-sea-700 underline-offset-2 hover:underline"
      >
        {tc("clearAll")}
      </Link>
    </div>
  );
}

/**
 * Unclaimed registry doctors with no live invite, as the one DoctorCard row (never forked): what the doctor will be shown,
 * with Invite (or Invite again) opening the invite form. Under each row: the NPI and what happened to the last invite.
 */
export function CandidateList({
  candidates,
  query,
  zone,
}: {
  candidates: Array<{ doctor: SampleDoctor; last?: OutreachInvite }>;
  query: OutreachQuery;
  zone: string;
}) {
  const t = useTranslations("adminOutreach");
  const tl = useTranslations("languages");
  const loc = useLocale() as Locale;
  const lastLine = (last?: OutreachInvite) => {
    if (!last) return t("invite.never");
    const at = last.status === "bounced" ? last.bouncedAt : last.status === "revoked" ? last.revokedAt : last.expiresAt;
    const date = at ? formatDate(at, zone, loc) : "";
    return last.status === "bounced" || last.status === "revoked" ? t(`invite.last.${last.status}`, { date }) : t("invite.last.expired", { date });
  };
  return (
    <ul className="flex flex-col gap-4">
      {candidates.map(({ doctor, last }) => (
        <li key={doctor.id}>
          <DoctorCard
            doctor={toDoctorCardData(doctor, loc, zone, tl)}
            state={doctor.state}
            size="row"
            action={{ href: outreachHref({ invite: doctor.id, tz: query.tz }), label: last ? t("invite.again") : t("invite.action") }}
          />
          <p className="mt-2 flex flex-wrap gap-x-2 px-1 text-sm text-ink-700">
            <span>{t.rich("invite.npi", { npi: doctor.npi, ltr: (c) => <span className="ltr-run tabular">{c}</span> })}</span>
            <span aria-hidden="true">·</span>
            <span>{lastLine(last)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Reference, one level down (rule A5): the rules behind the numbers, from config/business.ts. */
export function HowInvitesWork() {
  const t = useTranslations("adminOutreach");
  const loc = useLocale() as Locale;
  const days = outreach.inviteValidDays;
  const opens = business.inviteRateLimitPerIpPerHour;
  const lines = [
    t("how.oneByOne"),
    t("how.link", { days, daysLabel: formatNumber(days, loc) }),
    t("how.opened"),
    t("how.bounced"),
    t("how.limit", { count: opens, countLabel: formatNumber(opens, loc) }),
    t("how.revoke"),
  ];
  return (
    <Surface className="py-1">
      <Disclosure summary={t("how.title")}>
        <ul className="list-disc space-y-1.5 ps-5 text-[15px]">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Disclosure>
    </Surface>
  );
}
