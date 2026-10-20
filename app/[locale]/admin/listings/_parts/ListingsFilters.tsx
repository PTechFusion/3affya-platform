// The filters above the listings table (screen 39), built from the same primitives as /search: status chips with counts
// (rule S10) that are links, so each status has its own URL (rule S3); search by name or NPI and the specialty in one plain
// GET form, which works before JavaScript and keeps the query in the field (the specialty applies on change once JavaScript
// runs); applied filters as removable chips with Clear all
// (rule S12). One status at a time: the statuses are exclusive, and All is the way back.
import { Link } from "@/i18n/navigation";
import { Button, Chip, CloseIcon, Field, Input } from "@/components/ui";
import { SpecialtySelect } from "./SpecialtySelect";

export type StatusChip = { key: string; label: string; count: string; href: string; current: boolean };
export type AppliedChip = { key: string; label: string; removeLabel: string; href: string };

export function ListingsFilters({
  action,
  labels,
  statusChips,
  hidden,
  q,
  specialty,
  specialtyOptions,
  applied,
  clearAll,
}: {
  /** The form's action, with the locale prefix. */
  action: string;
  labels: { status: string; form: string; search: string; specialty: string; allSpecialties: string; submit: string; applied: string; clearAll: string };
  statusChips: StatusChip[];
  /** Filters and prototype switches the form carries along (status, tz, per). */
  hidden: Record<string, string>;
  q: string;
  specialty: string | null;
  specialtyOptions: Array<{ value: string; label: string }>;
  applied: AppliedChip[];
  clearAll: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label={labels.status}>
        <ul className="flex flex-wrap gap-2">
          {statusChips.map((c) => (
            <li key={c.key}>
              <Link href={c.href} scroll={false} aria-current={c.current ? "true" : undefined} className="block rounded-[var(--radius-tag)]">
                <Chip tone={c.current ? "lagoon" : "sand"}>
                  <span className={c.current ? "font-semibold" : undefined}>{c.label}</span>
                  <span className="tabular ms-2 rounded-[var(--radius-tag)] bg-white/80 px-2 text-[12.5px] font-semibold text-ink-700">{c.count}</span>
                </Chip>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Keyed by its values: a chip or Clear all navigates without a reload, and the fields must show the new values. */}
      <form key={`${q}|${specialty ?? ""}`} role="search" aria-label={labels.form} action={action} method="get" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Field id="listings-q" label={labels.search}>
          {/* Rule S3: a visible submit beside the field, on phone too. */}
          <div className="flex gap-2">
            <Input
              id="listings-q"
              type="search"
              name="q"
              defaultValue={q}
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <Button type="submit" variant="secondary" className="shrink-0 px-4 sm:px-5">
              {labels.submit}
            </Button>
          </div>
        </Field>
        <Field id="listings-specialty" label={labels.specialty}>
          <SpecialtySelect id="listings-specialty" name="specialty" defaultValue={specialty ?? ""}>
            <option value="">{labels.allSpecialties}</option>
            {specialtyOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SpecialtySelect>
        </Field>
      </form>

      {applied.length ? (
        <ul aria-label={labels.applied} className="flex flex-wrap items-center gap-2">
          {applied.map((c) => (
            <li key={c.key}>
              <Link href={c.href} scroll={false} aria-label={c.removeLabel} className="block rounded-[var(--radius-tag)]">
                <Chip tone="lagoon">
                  {c.label}
                  <CloseIcon className="ms-2 size-3.5" />
                </Chip>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={clearAll}
              scroll={false}
              className="inline-flex min-h-10 items-center rounded-[var(--radius-field)] px-2 text-sm font-semibold text-sea-700 hover:underline"
            >
              {labels.clearAll}
            </Link>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
