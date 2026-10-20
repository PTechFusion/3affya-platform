// The members list (screen 42): the totals, the view chips (Active and past due by default, the rest one chip away, rule A5),
// then the rows. Phone: one card per professional, the whole card opens the detail sheet and the Stripe link sits on top of it.
// Desktop: one table, the name opens the sheet. Both are rendered from the same row views; only one shows at a time.
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge, CheckIcon, Chip, Surface } from "@/components/ui";
import { formatNumber, type Locale } from "@/lib/format";
import { membersHref, MEMBERS_FILTERS, type MembersFilter, type MembersQuery } from "./shared";
import type { MemberRowView, MembersView } from "./members";

const linkClass = "font-semibold text-sea-700 underline-offset-2 hover:underline";

export function Totals({ totals, locale }: { totals: MembersView["totals"]; locale: Locale }) {
  const t = useTranslations("adminMembers");
  const n = (v: number) => formatNumber(v, locale);
  const tiles = [
    { term: t("totals.mrr"), value: totals.mrr, note: t("totals.mrrNote", { count: totals.renewing, countLabel: n(totals.renewing) }), wide: true },
    { term: t("totals.pastDue"), value: n(totals.pastDue), note: t("totals.pastDueNote", { amount: totals.pastDueAmount }) },
    { term: t("totals.ending"), value: n(totals.ending), note: t("totals.endingNote", { amount: totals.endingAmount }) },
  ];
  return (
    <section aria-label={t("totals.label")}>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.term} className={`rounded-[var(--radius-field)] border border-sand-200 bg-white p-3 sm:p-4 ${tile.wide ? "col-span-2 sm:col-span-1" : ""}`}>
            <dt className="text-sm font-semibold text-ink-700">{tile.term}</dt>
            <dd className="tabular mt-0.5 text-2xl font-bold text-sea-900">{tile.value}</dd>
            <dd className="text-sm text-ink-700">{tile.note}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-sm text-ink-500">{t("totals.footnote")}</p>
    </section>
  );
}

export function FilterChips({
  current,
  counts,
  query,
}: {
  current?: MembersFilter;
  counts?: Record<MembersFilter, string>;
  query: Pick<MembersQuery, "tz">;
}) {
  const t = useTranslations("adminMembers");
  return (
    <nav aria-label={t("filters.label")}>
      <ul className="flex flex-wrap gap-2">
        {MEMBERS_FILTERS.map((f) => {
          const selected = f === current;
          return (
            <li key={f}>
              <Link
                href={membersHref({ status: f, tz: query.tz })}
                aria-current={selected ? "page" : undefined}
                className="block rounded-[var(--radius-tag)]"
              >
                <Chip tone={selected ? "lagoon" : "sand"}>
                  <span className="inline-flex items-center gap-1.5">
                    {selected ? <CheckIcon /> : null}
                    {t(`filters.${f}`)}
                    {counts ? <span className="tabular text-ink-700">{counts[f]}</span> : null}
                  </span>
                </Chip>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Marker({ marker }: { marker: MemberRowView["marker"] }) {
  const t = useTranslations("adminMembers");
  if (!marker) return null;
  return <Badge tone="info">{t(marker === "waiting" ? "row.waiting" : "row.justChanged")}</Badge>;
}

function StripeLink({ row, className = "" }: { row: MemberRowView; className?: string }) {
  const t = useTranslations("adminMembers");
  if (!row.stripeHref) return <span className={`text-sm text-ink-500 ${className}`}>{t("row.noStripe")}</span>;
  return (
    <a
      href={row.stripeHref}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center ${linkClass} ${className}`}
    >
      {t("row.stripe")}
      {/* The accessible name starts with the visible text (WCAG 2.5.3); the rest says whose subscription and that it opens a new tab. */}
      <span className="sr-only"> · {t("row.stripeLabel", { name: row.name })}</span>
    </a>
  );
}

function When({ row }: { row: MemberRowView }) {
  return (
    <>
      <p className={row.warn ? "font-semibold text-gold-700" : "text-ink-900"}>{row.when}</p>
      {row.whenNote ? <p className={`text-sm ${row.warn ? "font-semibold text-gold-700" : "text-ink-700"}`}>{row.whenNote}</p> : null}
    </>
  );
}

export function MemberRows({ rows }: { rows: MemberRowView[] }) {
  const t = useTranslations("adminMembers");
  return (
    <>
      <ul className="flex flex-col gap-3 lg:hidden">
        {rows.map((row) => (
          <li key={row.doctorId}>
            <Surface className="relative flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold leading-snug text-sea-900">
                    {/* The whole card opens the sheet; the Stripe link below is lifted above this cover. */}
                    <Link href={row.detailHref} scroll={false} className="after:absolute after:inset-0 after:rounded-[var(--radius-card)] hover:underline">
                      {row.name}
                    </Link>
                  </h3>
                  <p className="text-sm text-ink-700">{row.specialty}</p>
                </div>
                <Badge tone={row.tone}>{row.statusLabel}</Badge>
              </div>
              <div>
                <p className="text-ink-900">
                  {row.plan} · <span className="tabular">{row.price}</span>
                </p>
                <When row={row} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-sand-200 pt-1">
                <StripeLink row={row} className="relative z-10" />
                <Marker marker={row.marker} />
              </div>
            </Surface>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-sand-200 bg-white lg:block">
        <table className="w-full">
          <caption className="sr-only">{t("table.caption")}</caption>
          <thead className="bg-sand-100 text-sm text-ink-700">
            <tr>
              <th scope="col" className="px-4 py-3 text-start font-semibold">{t("table.professional")}</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">{t("table.plan")}</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">{t("table.status")}</th>
              <th scope="col" className="px-4 py-3 text-start font-semibold">{t("table.renewal")}</th>
              <th scope="col" className="px-4 py-3 text-end font-semibold">{t("table.stripe")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {rows.map((row) => (
              <tr key={row.doctorId} className="align-top">
                <th scope="row" className="px-4 py-3 text-start font-normal">
                  <Link href={row.detailHref} scroll={false} className={linkClass}>
                    {row.name}
                  </Link>
                  <p className="text-sm text-ink-700">{row.specialty}</p>
                </th>
                <td className="px-4 py-3">
                  <p className="text-ink-900">{row.plan}</p>
                  <p className="tabular text-sm text-ink-700">{row.price}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1.5">
                    <Badge tone={row.tone}>{row.statusLabel}</Badge>
                    <Marker marker={row.marker} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <When row={row} />
                </td>
                <td className="px-4 py-1.5 text-end">
                  <StripeLink row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
