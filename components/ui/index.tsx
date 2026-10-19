// Shared UI primitives. Every product screen composes these; do not restyle them per page.
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(" ");

/* ---------------- Button ---------------- */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "lg";
const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-field)] font-semibold transition-colors disabled:opacity-45 disabled:cursor-not-allowed min-h-12";
const buttonSizes: Record<ButtonSize, string> = { md: "px-5 py-3 text-[15px]", lg: "px-6 py-4 text-base" };
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-sea-700 text-white hover:bg-sea-800",
  secondary: "bg-white text-sea-700 border border-sea-700 hover:bg-sea-100",
  ghost: "bg-transparent text-sea-700 hover:bg-sand-100",
  danger: "bg-danger text-white hover:brightness-95",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={cx(buttonBase, buttonSizes[size], buttonVariants[variant], className)} {...props} />;
}

/** A link styled as a button. Use this for navigation; never nest a Button inside a Link (invalid HTML). */
export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={cx(buttonBase, buttonSizes[size], buttonVariants[variant], className)} {...props} />;
}

/* ---------------- Field ---------------- */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-semibold text-ink-900">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ invalid, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cx(
        "w-full min-h-12 rounded-[var(--radius-field)] border bg-white px-4 py-3 text-ink-900 placeholder:text-ink-500/70",
        invalid ? "border-danger" : "border-sand-300 focus:border-lagoon-600",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ invalid, className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cx(
        "w-full min-h-12 rounded-[var(--radius-field)] border bg-white px-4 py-3 text-ink-900",
        invalid ? "border-danger" : "border-sand-300 focus:border-lagoon-600",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

/* ---------------- Tag and Badge ---------------- */
/** Expertise tag: one tinted style only. */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-[var(--radius-tag)] bg-lagoon-100 px-3 py-1 text-[13px] font-medium text-lagoon-900">
      {children}
    </span>
  );
}

export type BadgeTone = "verified" | "pending" | "unclaimed" | "info" | "success" | "warning" | "danger";
const badgeTones: Record<BadgeTone, string> = {
  verified: "bg-gold-100 text-gold-700",
  pending: "bg-sand-200 text-ink-700",
  unclaimed: "bg-sand-200 text-ink-700",
  info: "bg-sky-100 text-sea-800",
  success: "bg-[#E4F4EC] text-success",
  warning: "bg-gold-100 text-warning",
  danger: "bg-[#FBE9E7] text-danger",
};
export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-[var(--radius-tag)] px-2.5 py-1 text-[12.5px] font-semibold", badgeTones[tone])}>
      {tone === "verified" ? <CheckIcon /> : null}
      {children}
    </span>
  );
}

/** Checkmark: never mirrored (rule R2). */
export function CheckIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className} style={{ transform: "none" }}>
      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Directional chevron: mirrored in RTL via the rtl: variant. */
export function ChevronNext({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={cx(className, "rtl:-scale-x-100")}>
      <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Disclosure chevron: points down, never mirrored; rotate it on open. */
export function ChevronDown({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------- Skeleton and Empty ---------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx("skeleton", className)} />;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-sand-300 bg-sand-100 px-6 py-10 text-center">
      <div className="size-12 rounded-full bg-lagoon-100" aria-hidden="true" />
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      <p className="max-w-sm text-ink-700">{body}</p>
      {action}
    </div>
  );
}

/* ---------------- Coach mark ---------------- */
/** `action` (optional) sits at the end of the mark, e.g. a dismiss button for a first-use hint. */
export function CoachMark({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div role="note" className="relative max-w-xs rounded-2xl bg-sea-900 px-4 py-3 text-white shadow-[var(--shadow-card)]">
      <span aria-hidden="true" className="absolute -top-2 start-6 size-4 rotate-45 bg-sea-900" />
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-white/85">{body}</p>
      {action ? <div className="mt-2.5 flex justify-end">{action}</div> : null}
    </div>
  );
}

/* ---------------- Card surface ---------------- */
export function Surface({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-[var(--radius-card)] border border-sand-200 bg-white p-5", className)}>{children}</div>;
}

/* ---------------- Chip ---------------- */
/** Tappable pill for quick picks (specialty chips, quick replies). Wrap in a Link or button for the action. */
export function Chip({ tone = "sand", children }: { tone?: "sand" | "water" | "lagoon"; children: ReactNode }) {
  const tones = {
    sand: "bg-sand-100 text-sea-800 hover:bg-sand-200",
    water: "bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25",
    // Selected or applied values (applied-filter chips, rule S12): reads as chosen on sand and white surfaces.
    lagoon: "bg-lagoon-100 text-lagoon-900 ring-1 ring-lagoon-600/40 hover:bg-white",
  };
  return (
    <span className={cx("inline-flex min-h-10 items-center rounded-[var(--radius-tag)] px-4 py-1.5 text-sm font-medium transition-colors", tones[tone])}>
      {children}
    </span>
  );
}

/* ---------------- Section heading ---------------- */
export function SectionHeading({ title, lead, action }: { title: string; lead?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-bold text-sea-900 sm:text-3xl">{title}</h2>
        {lead ? <p className="mt-1.5 text-ink-700">{lead}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Search icon ---------------- */
/** Magnifier for search fields: never mirrored in RTL (rule R2). */
export function SearchIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className} style={{ transform: "none" }}>
      <circle cx="8.5" cy="8.5" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M13 13l4.25 4.25" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- Textarea ---------------- */
/** Multi-line text field with the same surface, border and error treatment as Input. Pair it with Field for the label. */
export function Textarea({ invalid, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cx(
        "block w-full min-h-36 resize-y rounded-[var(--radius-field)] border bg-white px-4 py-3 text-ink-900 placeholder:text-ink-500/70",
        invalid ? "border-danger" : "border-sand-300 focus:border-lagoon-600",
        className,
      )}
      {...props}
    />
  );
}

/* ---------------- Disclosure ---------------- */
/** One accordion row: <details> with the summary line and a chevron that turns when open. Use for FAQs and "what to prepare" lists (rule X5). */
export function Disclosure({ id, summary, open, children }: { id?: string; summary: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <details id={id} open={open} className="group py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown className="size-4 shrink-0 text-sea-700 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 text-ink-700">{children}</div>
    </details>
  );
}

/* ---------------- CTA band ---------------- */
/** Closing call-to-action band on deep sea, so a page never ends on a false floor (rule H11). */
export function CtaBand({ title, body, action }: { title: string; body?: string; action: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-[var(--radius-card)] bg-sea-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {body ? <p className="mt-1 text-white/85">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Radio card ---------------- */
/**
 * One choice in a radio group, drawn as a tappable card: a title and an optional line under it. Group several inside a
 * <fieldset> with a <legend>; the native radio keeps arrow-key movement and screen-reader semantics. `invalid` marks the
 * group when nothing is chosen yet (the error text goes under the group, rule F5).
 */
export function RadioCard({
  title,
  description,
  invalid,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "title"> & { title: string; description?: string; invalid?: boolean }) {
  return (
    <label
      className={cx(
        "flex min-h-12 cursor-pointer items-start gap-2.5 rounded-[var(--radius-field)] border bg-white p-3 transition-colors has-checked:border-sea-700 has-checked:bg-sea-100",
        invalid ? "border-danger" : "border-sand-300 hover:border-lagoon-600",
        className,
      )}
    >
      <input type="radio" className="mt-1 size-5 shrink-0 accent-sea-700" {...props} />
      <span className="flex min-w-0 flex-col">
        <span className="font-semibold text-ink-900">{title}</span>
        {description ? <span className="text-sm text-ink-700">{description}</span> : null}
      </span>
    </label>
  );
}
/* ---------------- Slot link ---------------- */
/** One open time as a 48 px link into the slot picker (rules W2, P6): an optional day line over the time. Name the zone once
 *  beside the group and pass `label` (day, time and zone in words) so a screen reader hears the whole slot. */
export function SlotLink({
  href,
  time,
  day,
  label,
}: {
  href: React.ComponentProps<typeof Link>["href"];
  time: string;
  day?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex min-h-12 flex-col items-center justify-center rounded-[var(--radius-field)] border border-sea-700 bg-white px-2 py-1.5 text-center text-sea-800 transition-colors hover:bg-sea-100"
    >
      {day ? <span className="text-xs font-medium text-ink-700">{day}</span> : null}
      <span className="tabular text-[15px] font-semibold">{time}</span>
    </Link>
  );
}
/* ---------------- Close icon ---------------- */
/** Cross for removable chips and close controls: symmetric, never mirrored. */
export function CloseIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- Breadcrumbs ---------------- */
/**
 * One-line trail (rule S15): ancestors as links, the current page last and unlinked. On phone only the parent level shows,
 * as a back link. Pass the items from the top (Home) down; the last item is the current page.
 */
export function Breadcrumbs({ label, items }: { label: string; items: Array<{ label: string; href?: string }> }) {
  const parent = items.slice(0, -1).reverse().find((item) => item.href);
  return (
    <nav aria-label={label} className="text-sm">
      <ol className="hidden flex-wrap items-center gap-1.5 text-ink-700 sm:flex">
        {items.map((item, i) => (
          <li key={`${i}-${item.label}`} className="flex items-center gap-1.5">
            {i > 0 ? <ChevronNext className="size-3.5 text-ink-500" /> : null}
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="font-semibold text-sea-700 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
      {parent?.href ? (
        <Link href={parent.href} className="inline-flex min-h-8 items-center gap-1 font-semibold text-sea-700 hover:underline sm:hidden">
          {/* Back chevron: the flipped wrapper plus ChevronNext's own RTL mirror point it toward the start in both directions. */}
          <span className="inline-flex -scale-x-100">
            <ChevronNext className="size-3.5" />
          </span>
          {parent.label}
        </Link>
      ) : null}
    </nav>
  );
}

/* ---------------- Segmented control ---------------- */
/**
 * Two to four mutually exclusive views of one thing (card side, card language) as a single row of native radios: arrow keys
 * move between options and the legend names the group. Controlled: the caller holds the value. Give an option `lang` when its
 * label is in another script (rule H10: each language named in its own script).
 */
export function SegmentedControl<V extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: Array<{ value: V; label: string; lang?: string }>;
  value: V;
  onChange: (value: V) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm font-semibold text-ink-700">{legend}</legend>
      <div className="inline-flex max-w-full flex-wrap rounded-[var(--radius-tag)] border border-sand-300 bg-white p-1">
        {options.map((o) => (
          <label
            key={o.value}
            lang={o.lang}
            className="flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-tag)] px-4 text-[15px] font-semibold text-ink-700 transition-colors hover:text-sea-900 has-checked:bg-sea-700 has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-lagoon-500"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ---------------- Slot time ---------------- */
/** One open time shown but not offered as a link (a doctor's preview of the patient view, summaries): the SlotLink frame
 *  without the link. Name the zone once beside the group (rule P6). */
export function SlotTime({ time, day }: { time: string; day?: string }) {
  return (
    <span className="flex min-h-12 flex-col items-center justify-center rounded-[var(--radius-field)] border border-sea-700 bg-white px-2 py-1.5 text-center text-sea-800">
      {day ? <span className="text-xs font-medium text-ink-700">{day}</span> : null}
      <span className="tabular text-[15px] font-semibold">{time}</span>
    </span>
  );
}

/* ---------------- Icon button ---------------- */
/** A square icon-only button, 44 px (rule W2), for remove and close controls. `label` is its accessible name and tooltip. */
export function IconButton({
  label,
  tone = "default",
  className,
  children,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & { label: string; tone?: "default" | "onDark" }) {
  const tones = {
    default: "text-ink-700 hover:bg-sand-200 hover:text-ink-900",
    onDark: "text-white/85 hover:bg-white/15 hover:text-white",
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-field)] transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------------- Toast ---------------- */
/**
 * Undo bar (rule B10: undo instead of a confirmation): one line saying what just changed, one action, a close control. It sits
 * at the bottom of the screen, above the portal's phone bar. Keep ToastRegion mounted and put the Toast inside it, so screen
 * readers hear each new message.
 */
export function ToastRegion({ children }: { children?: ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 lg:bottom-6">
      {children}
    </div>
  );
}
/* ---------------- Check card ---------------- */
/**
 * The checkbox twin of RadioCard: one of several choices that can all be on (languages spoken, visit types offered). Group
 * them in a <fieldset> with a <legend>; `children` renders under the title while the box is checked (e.g. a follow-up select).
 */
export function CheckCard({
  title,
  description,
  className,
  children,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "title" | "children"> & { title: string; description?: string; children?: ReactNode }) {
  return (
    <div
      className={cx(
        "rounded-[var(--radius-field)] border border-sand-300 bg-white transition-colors hover:border-lagoon-600 has-checked:border-sea-700 has-checked:bg-sea-100",
        className,
      )}
    >
      <label className="flex min-h-12 cursor-pointer items-start gap-2.5 p-3">
        <input type="checkbox" className="mt-1 size-5 shrink-0 accent-sea-700" {...props} />
        <span className="flex min-w-0 flex-col">
          <span className="font-semibold text-ink-900">{title}</span>
          {description ? <span className="text-sm text-ink-700">{description}</span> : null}
        </span>
      </label>
      {props.checked && children ? <div className="px-3 pb-3">{children}</div> : null}
    </div>
  );
}

export function Toast({
  id,
  message,
  actionLabel,
  onAction,
  dismissLabel,
  onDismiss,
}: {
  /** Lets the page move focus to the bar's buttons, e.g. to Close after Undo removes the Undo button. */
  id?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  dismissLabel: string;
  onDismiss: () => void;
}) {
  return (
    <div id={id} className="pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-[var(--radius-field)] bg-sea-900 py-1.5 ps-4 pe-1.5 text-white shadow-[var(--shadow-card)]">
      <p className="min-w-0 flex-1 text-sm">{message}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex min-h-11 shrink-0 items-center rounded-[var(--radius-field)] px-3 text-[15px] font-semibold text-lagoon-300 transition-colors hover:bg-white/10"
        >
          {actionLabel}
        </button>
      ) : null}
      <IconButton tone="onDark" label={dismissLabel} onClick={onDismiss}>
        <CloseIcon />
      </IconButton>
    </div>
  );
}
