// The listings table (screen 39). Desktop: a real table with the layout call's columns: name (with NPI and status), specialty,
// city, verified on, next re-verification (rule A2), one action. Phone: each row stacks as a block, the dates side by side.
// The whole row opens the edit drawer through one stretched link on the name; the row's action is a sibling link above it,
// so nothing interactive is nested (PLAYBOOK §4). Unclaimed rows carry the plain sand badge and the registry line, never the
// gold verified look (rule U1).
import { Link } from "@/i18n/navigation";
import { Badge, ChevronNext, Surface, type BadgeTone } from "@/components/ui";

export type RowView = {
  id: string;
  name: string;
  /** The name in the other script, with its language. */
  altName: string;
  altLang: "ar" | "en";
  npi: string;
  statusLabel: string;
  statusTone: BadgeTone;
  /** What the status means for this row, with its date ("In review since 17 Oct 2026"). */
  line: string | null;
  specialty: string;
  city: string;
  verifiedOn: string | null;
  next: { date: string; basis: string; due: { label: string; tone: BadgeTone } | null } | null;
  editHref: string;
  action: { href: string; label: string; ariaLabel: string } | null;
};

export type TableLabels = {
  caption: string;
  name: string;
  specialty: string;
  city: string;
  verifiedOn: string;
  nextCheck: string;
  actions: string;
  npi: string;
  notVerified: string;
  noneScheduled: string;
  editLabel: string;
};

const cell = "lg:py-4 lg:pe-4 lg:align-top";

export function ListingsTable({ rows, labels }: { rows: RowView[]; labels: TableLabels }) {
  return (
    <Surface>
      <table className="w-full max-lg:block">
        <caption className="sr-only">{labels.caption}</caption>
        <thead className="max-lg:sr-only">
          <tr className="border-b border-sand-200 text-start text-sm text-ink-500">
            <th scope="col" className="pb-3 pe-4 text-start font-semibold lg:w-[32%]">
              {labels.name}
            </th>
            <th scope="col" className="pb-3 pe-4 text-start font-semibold">
              {labels.specialty}
            </th>
            <th scope="col" className="pb-3 pe-4 text-start font-semibold">
              {labels.city}
            </th>
            <th scope="col" className="pb-3 pe-4 text-start font-semibold">
              {labels.verifiedOn}
            </th>
            <th scope="col" className="pb-3 pe-4 text-start font-semibold">
              {labels.nextCheck}
            </th>
            <th scope="col" className="pb-3 text-end font-semibold">
              <span className="sr-only">{labels.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sand-200 max-lg:block">
          {rows.map((r) => (
            <Row key={r.id} row={r} labels={labels} />
          ))}
        </tbody>
      </table>
    </Surface>
  );
}

function Row({ row: r, labels }: { row: RowView; labels: TableLabels }) {
  const dash = (sr: string) => (
    <>
      <span aria-hidden="true" className="text-ink-500">
        —
      </span>
      <span className="sr-only">{sr}</span>
    </>
  );
  return (
    <tr className="relative transition-colors hover:bg-sand-50 max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-4 max-lg:gap-y-3 max-lg:py-4">
      <td className={`${cell} max-lg:col-span-2`}>
        <Link
          href={r.editHref}
          scroll={false}
          className="text-[17px] font-bold leading-snug text-sea-900 underline-offset-2 after:absolute after:inset-0 after:content-[''] hover:underline"
        >
          {r.name}
          <span className="sr-only"> · {labels.editLabel}</span>
        </Link>
        {/* Inline and isolated: the other script reads in its own direction but lines up with the page's start edge. */}
        <span className="block text-sm text-ink-500">
          <bdi lang={r.altLang}>{r.altName}</bdi>
        </span>
        <span className="block text-sm text-ink-500">
          {labels.npi} <span className="ltr-run tabular">{r.npi}</span>
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge tone={r.statusTone}>{r.statusLabel}</Badge>
          {r.line ? <span className="text-sm text-ink-700">{r.line}</span> : null}
        </span>
        <span className="mt-2 block text-[15px] leading-snug lg:hidden">
          <span className="font-semibold text-sea-800">{r.specialty}</span>
          <span className="text-ink-700"> · {r.city}</span>
        </span>
      </td>
      <td className={`${cell} text-[15px] text-ink-900 max-lg:hidden`}>{r.specialty}</td>
      <td className={`${cell} text-[15px] text-ink-700 max-lg:hidden`}>{r.city}</td>
      <td className={`${cell} ${r.verifiedOn ? "" : "max-lg:hidden"}`}>
        <span className="block text-xs font-semibold text-ink-500 lg:hidden">{labels.verifiedOn}</span>
        {r.verifiedOn ? <span className="tabular whitespace-nowrap text-[15px] text-ink-900">{r.verifiedOn}</span> : dash(labels.notVerified)}
      </td>
      <td className={`${cell} ${r.next ? "" : "max-lg:hidden"}`}>
        <span className="block text-xs font-semibold text-ink-500 lg:hidden">{labels.nextCheck}</span>
        {r.next ? (
          <>
            <span className="tabular block whitespace-nowrap text-[15px] text-ink-900">{r.next.date}</span>
            <span className="block text-sm text-ink-500">{r.next.basis}</span>
            {r.next.due ? (
              <span className="mt-1 flex whitespace-nowrap">
                <Badge tone={r.next.due.tone}>{r.next.due.label}</Badge>
              </span>
            ) : null}
          </>
        ) : (
          dash(labels.noneScheduled)
        )}
      </td>
      <td className={`${cell} max-lg:col-span-2 lg:pe-0 lg:text-end`}>
        {r.action ? (
          <Link
            href={r.action.href}
            aria-label={r.action.ariaLabel}
            className="relative z-10 inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-[var(--radius-field)] font-semibold text-sea-700 hover:underline"
          >
            {r.action.label}
            <ChevronNext className="size-4 shrink-0" />
          </Link>
        ) : (
          <Link
            href={r.editHref}
            className="relative z-10 inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-[var(--radius-field)] font-semibold text-sea-700 hover:underline"
          >
            {labels.editLabel}
            <ChevronNext className="size-4 shrink-0" />
          </Link>
        )}
      </td>
    </tr>
  );
}
