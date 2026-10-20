// Shared UI primitives. Every product screen composes these; do not restyle them per page.
import type { ReactNode } from "react";
import { formatSlotDay, formatTime, formatZone, type Locale } from "@/lib/format";
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
/* ---------------- Tab links ---------------- */
/**
 * Two to four views of one list as tabs that are links (e.g. ?tab=past): each view has its own URL, so it works without
 * JavaScript, survives a reload and can be shared. `current` marks the open view (aria-current); pass none while loading.
 * `count` is already formatted (lib/format) and sits in a pill after the label. On phone the tabs share the row equally.
 */
export function TabLinks({
  label,
  items,
  scroll = true,
  className,
}: {
  label: string;
  items: Array<{ href: React.ComponentProps<typeof Link>["href"]; label: string; count?: string; current?: boolean }>;
  /** false keeps the scroll position when a tab only swaps the content below it (Next's Link `scroll`). */
  scroll?: boolean;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cx("border-b border-sand-300", className)}>
      <ul className="-mb-px flex">
        {items.map((item) => (
          <li key={item.label} className="flex flex-1 sm:flex-none">
            <Link
              href={item.href}
              scroll={scroll}
              aria-current={item.current ? "page" : undefined}
              className={cx(
                "flex min-h-12 flex-1 items-center justify-center gap-2 border-b-[3px] px-5 text-[15px] font-semibold transition-colors",
                item.current ? "border-sea-700 text-sea-900" : "border-transparent text-ink-700 hover:border-sand-400 hover:text-sea-900",
              )}
            >
              {item.label}
              {item.count ? (
                <span
                  className={cx(
                    "tabular rounded-[var(--radius-tag)] px-2 py-0.5 text-[12.5px]",
                    item.current ? "bg-sea-100 text-sea-800" : "bg-sand-200 text-ink-700",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
/* ---------------- Sheet ---------------- */
/**
 * A modal panel on the native <dialog>: a bottom sheet on phone, a centred panel from sm up. The caller holds `ref` and calls
 * showModal() to open it; Close, Escape and a tap on the backdrop close it, and `onClose` hears every close. A header with the
 * title and Close, a body that scrolls, and an optional `footer` that stays put for the actions. Render it from a client
 * component (it takes handlers). `id` names the title for aria-labelledby.
 */
export function Sheet({
  ref,
  id,
  title,
  closeLabel,
  onClose,
  footer,
  children,
}: {
  ref: React.Ref<HTMLDialogElement>;
  id: string;
  title: string;
  closeLabel: string;
  onClose?: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-[var(--radius-card)] border-0 bg-sand-50 p-0 text-ink-900 shadow-[var(--shadow-card)] backdrop:bg-sea-900/40 sm:inset-0 sm:m-auto sm:max-h-[85dvh] sm:max-w-lg sm:rounded-[var(--radius-card)]"
    >
      <div className="flex max-h-[92dvh] flex-col sm:max-h-[85dvh]">
        <header className="flex items-center justify-between gap-3 border-b border-sand-200 bg-white px-4 py-2">
          <h2 id={`${id}-title`} className="text-lg font-bold text-sea-900">
            {title}
          </h2>
          <Button type="button" variant="ghost" className="px-3" onClick={(e) => e.currentTarget.closest("dialog")?.close()}>
            {closeLabel}
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? <footer className="border-t border-sand-200 bg-white px-4 py-3">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
/* ---------------- File pick ---------------- */
/**
 * A native file input drawn as a Button. The input stays in the tab order and screen readers announce it as a file picker;
 * the label is the visible button. `capture="environment"` opens the phone camera (rule T10). `onFiles` gets the chosen files
 * and the input is cleared, so the same file can be chosen again. Use it from a client component (it takes a callback).
 */
export function FilePick({
  id,
  label,
  accept,
  multiple,
  capture,
  variant = "secondary",
  icon,
  describedBy,
  disabled,
  onFiles,
  className,
}: {
  id: string;
  label: string;
  accept: string;
  multiple?: boolean;
  capture?: "environment" | "user";
  variant?: Exclude<ButtonVariant, "danger">;
  icon?: ReactNode;
  describedBy?: string;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cx(
        buttonBase,
        buttonSizes.md,
        buttonVariants[variant],
        "cursor-pointer has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-lagoon-500",
        disabled && "pointer-events-none opacity-45",
        className,
      )}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        capture={capture}
        disabled={disabled}
        aria-describedby={describedBy}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files ?? []);
          e.currentTarget.value = "";
          if (files.length) onFiles(files);
        }}
      />
      {icon}
      {label}
    </label>
  );
}

/* ---------------- Progress bar ---------------- */
/**
 * Determinate progress for waits over 10 seconds (rule L1): a real count such as pages read, never a made-up percentage
 * (rule T11). It fills from the start edge, so it mirrors in RTL (rule R2). `label` names it; `valueText` reads the count
 * in words ("4 of 12 pages done").
 */
export function ProgressBar({ value, max, label, valueText }: { value: number; max: number; label: string; valueText: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      className="h-2.5 w-full overflow-hidden rounded-[var(--radius-tag)] bg-sand-200"
    >
      <div className="h-full rounded-[var(--radius-tag)] bg-lagoon-600 transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
/* ---------------- Slot option ---------------- */
/**
 * One open time to choose (the slot picker, rules W2, P6): a native radio in the SlotLink frame, 48 px, so arrow keys move
 * between the times of one day and the group's legend names the day. `label` is the whole slot in words (day, time and zone)
 * for screen readers. `note` is a short line under the time, e.g. the doctor's own time on the chosen slot; `highlight` tints
 * an unchosen option to draw the eye (the earliest time). A disabled option reads as gone: struck through on sand.
 */
export function SlotOption({
  time,
  note,
  highlight,
  label,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { time: string; note?: ReactNode; highlight?: boolean; label?: string }) {
  return (
    <label
      className={cx(
        "flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-[var(--radius-field)] border px-2 py-1.5 text-center transition-colors",
        "has-checked:border-sea-700 has-checked:bg-sea-700 has-checked:text-white",
        "has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-lagoon-500",
        "has-disabled:cursor-not-allowed has-disabled:border-sand-300 has-disabled:bg-sand-100 has-disabled:text-ink-500 has-disabled:line-through",
        highlight ? "border-lagoon-600 bg-lagoon-100 text-lagoon-900 hover:bg-white" : "border-sea-700 bg-white text-sea-800 hover:bg-sea-100",
        className,
      )}
    >
      <input type="radio" aria-label={label} className="sr-only" {...props} />
      <span className="tabular text-[15px] font-semibold">{time}</span>
      {note ? <span className="text-xs font-medium leading-tight">{note}</span> : null}
    </label>
  );
}

/* ---------------- Clock and lock icons ---------------- */
/** Clock beside a time-zone line: never mirrored in RTL (rule R2). */
export function ClockIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className} style={{ transform: "none" }}>
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Padlock for a security cue (rule P3: one or two cues inside the payment box). Symmetric, never mirrored. */
export function LockIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- When ---------------- */
/**
 * "Tue, Oct 20 · 11:00 AM Chicago (GMT−5)": a visit's day and time with the zone named (rule P6). The clock time and the zone
 * each stay on one line (the zone as its own LTR run, rule R3), so a narrow row never splits them. Used by the inbox (32), the
 * bookings list (22) and the booking page (21).
 */
export function When({ instant, timeZone, locale }: { instant: Date; timeZone: string; locale: Locale }) {
  return (
    <>
      {formatSlotDay(instant, timeZone, locale)} · <span className="whitespace-nowrap">{formatTime(instant, timeZone, locale)}</span>{" "}
      <span className="ltr-run">{formatZone(instant, timeZone)}</span>
    </>
  );
}

/** Tag for rich messages: keeps a time and its zone on one line. */
export const nowrap = (chunks: ReactNode) => <span className="whitespace-nowrap">{chunks}</span>;

/* ---------------- Notice ---------------- */
/**
 * A boxed message in the page flow (PLAYBOOK §9, the one notice box): `info` for a neutral fact, `success` after something
 * worked, `warning` for something that needs attention, `danger` for a failure. A title that says what happened, an optional
 * body with the fix (rule L4), at most one action. The tone is the tint and the start-edge bar, never colour alone: the title
 * carries the meaning. `role` "alert" for an error that appears after an action, "status" for a result; omit it for standing
 * notes. Tints are the Badge tones.
 */
export type NoticeTone = "info" | "success" | "warning" | "danger";
const noticeTones: Record<NoticeTone, string> = {
  info: "border-sea-500 bg-sky-100",
  success: "border-success bg-[#E4F4EC]",
  warning: "border-gold-500 bg-gold-100",
  danger: "border-danger bg-[#FBE9E7]",
};
export function Notice({
  tone = "info",
  title,
  body,
  action,
  role,
  id,
  className,
}: {
  tone?: NoticeTone;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  role?: "alert" | "status";
  id?: string;
  className?: string;
}) {
  return (
    <div
      id={id}
      role={role}
      className={cx(
        "flex flex-col items-start gap-3 rounded-[var(--radius-field)] border-s-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        noticeTones[tone],
        className,
      )}
    >
      <div className="min-w-0">
        <p className="font-semibold text-ink-900">{title}</p>
        {body ? <div className="mt-0.5 text-ink-700">{body}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ---------------- Notice ---------------- */
/**
 * A boxed message about the page or about what just happened (PLAYBOOK §9 backlog: the one notice box). `tone`: info (a fact to
 * know), success (something just done), warning (something waits or is off), danger (something failed or needs fixing). The
 * title says it in words, so the tint is never the only signal (rule W1). One optional `action` (a LinkButton or Button) sits
 * at the end. Pass role="status" for a message that appears after an action and role="alert" for a failure; a notice that is
 * part of the page needs no role. The marks are symmetric glyphs and never mirror (rule R2).
 */
export type NoticeTone = "info" | "success" | "warning" | "danger";
const noticeTones: Record<NoticeTone, { box: string; mark: string }> = {
  info: { box: "border-sky-500/40 bg-sky-100", mark: "text-sea-800" },
  success: { box: "border-success/30 bg-[#E4F4EC]", mark: "text-success" },
  warning: { box: "border-gold-500/50 bg-gold-100", mark: "text-warning" },
  danger: { box: "border-danger/30 bg-[#FBE9E7]", mark: "text-danger" },
};

function NoticeMark({ tone }: { tone: NoticeTone }) {
  if (tone === "success") return <CheckIcon className="size-4" />;
  // "i" for information, "!" for warning and danger.
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4" style={{ transform: "none" }}>
      {tone === "info" ? (
        <path d="M8 7v5M8 4.25v.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M8 3.5v6M8 12.25v.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function Notice({
  tone = "info",
  title,
  body,
  action,
  role,
  id,
  className,
}: {
  tone?: NoticeTone;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  role?: "status" | "alert";
  id?: string;
  className?: string;
}) {
  const t = noticeTones[tone];
  return (
    <div
      id={id}
      role={role}
      className={cx("flex flex-col gap-3 rounded-[var(--radius-field)] border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-5", t.box, className)}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden="true" className={cx("mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white", t.mark)}>
          <NoticeMark tone={tone} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink-900">{title}</p>
          {body ? <div className="mt-0.5 text-[15px] text-ink-700">{body}</div> : null}
        </div>
      </div>
      {action ? <div className="shrink-0 ps-10 sm:ps-0">{action}</div> : null}
    </div>
  );
}

/* ---------------- Notice ---------------- */
/**
 * The one notice box (PLAYBOOK §9): a tinted panel with an optional bold title, a body and an optional action under it. Tones
 * reuse the Badge tints: info (sky), success, warning (gold), danger. The tone is never the only signal (rule F5): the title or
 * body says what happened. Pass `role="alert"` for an error the person must hear now, `role="status"` for a result that just
 * appeared; leave it off for a standing note. `icon` sits at the reading start, e.g. CheckIcon on a success.
 */
export type NoticeTone = "info" | "success" | "warning" | "danger";
const noticeTones: Record<NoticeTone, string> = {
  info: "border-sky-500/40 bg-sky-100",
  success: "border-success/35 bg-[#E4F4EC]",
  warning: "border-gold-500/50 bg-gold-100",
  danger: "border-danger/35 bg-[#FBE9E7]",
};
export function Notice({
  tone = "info",
  title,
  body,
  action,
  icon,
  role,
  id,
  className,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  role?: "alert" | "status" | "note";
  id?: string;
  className?: string;
}) {
  return (
    <div id={id} role={role} className={cx("flex items-start gap-3 rounded-[var(--radius-field)] border p-4 text-ink-900", noticeTones[tone], className)}>
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        {title ? <p className="font-bold">{title}</p> : null}
        {body ? <div className={cx("text-[15px] text-ink-700", title ? "mt-1" : undefined)}>{body}</div> : null}
        {action ? <div className="mt-3 flex flex-wrap gap-3">{action}</div> : null}
      </div>
    </div>
  );
}

/* ---------------- Notice ---------------- */
/**
 * A boxed message in the page flow (PLAYBOOK §9): what just changed (success), something to act on (warning, e.g. a past-due
 * payment), a failure (danger) or a plain note (info). A title, an optional body and an optional action row. `live` makes it a
 * live region: "status" for a change the user just made, "alert" for an error; leave it off for a notice that is simply part of
 * the page. `headingLevel` keeps the outline right where the notice sits under an h2.
 */
export type NoticeTone = "info" | "success" | "warning" | "danger";
const noticeTones: Record<NoticeTone, string> = {
  info: "border-sky-500/40 bg-sky-100",
  success: "border-success/40 bg-success/10",
  warning: "border-gold-500/50 bg-gold-100",
  danger: "border-danger/40 bg-danger/10",
};
export function Notice({
  tone = "info",
  title,
  body,
  action,
  live,
  headingLevel = 2,
  className,
}: {
  tone?: NoticeTone;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  live?: "status" | "alert";
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div role={live} className={cx("rounded-[var(--radius-card)] border p-4 sm:p-5", noticeTones[tone], className)}>
      <Heading className="text-lg font-bold text-ink-900">{title}</Heading>
      {body ? <div className="mt-1 text-ink-900">{body}</div> : null}
      {action ? <div className="mt-3 flex flex-wrap items-center gap-3">{action}</div> : null}
    </div>
  );
}

/* ---------------- Notice ---------------- */
/**
 * A boxed message inside the page (PLAYBOOK §9, replaces the hand-rolled notice boxes): a title, a body and an optional action,
 * in one of four tones. info: a fact to know before acting; success: something just worked; warning: needs attention soon;
 * danger: something failed or was refused, with the fix in the body or the action (rule L4). Pass `role` when the notice
 * appears after an action ("status" for info and success, "alert" for danger) so screen readers hear it. `titleAs` makes the
 * title a heading when the notice opens a section. The tone mark is symmetric and never mirrored.
 */
export type NoticeTone = "info" | "success" | "warning" | "danger";
const noticeTones: Record<NoticeTone, { box: string; title: string; mark: string }> = {
  info: { box: "border-sky-500/40 bg-sky-100", title: "text-sea-900", mark: "bg-white text-sea-800" },
  success: { box: "border-lagoon-600/30 bg-lagoon-100", title: "text-lagoon-900", mark: "bg-white text-lagoon-900" },
  warning: { box: "border-gold-500/50 bg-gold-100", title: "text-gold-700", mark: "bg-white text-warning" },
  danger: { box: "border-danger/40 bg-white", title: "text-danger", mark: "bg-sand-100 text-danger" },
};

export function Notice({
  tone = "info",
  title,
  titleAs: Title = "p",
  body,
  action,
  role,
  id,
  className,
  children,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  titleAs?: "p" | "h2" | "h3";
  body?: ReactNode;
  action?: ReactNode;
  role?: "status" | "alert" | "note";
  id?: string;
  className?: string;
  /** Extra content under the body, e.g. a quoted note or a short list. */
  children?: ReactNode;
}) {
  const t = noticeTones[tone];
  return (
    <div id={id} role={role} className={cx("flex items-start gap-3 rounded-[var(--radius-field)] border p-4", t.box, className)}>
      <span aria-hidden="true" className={cx("mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full", t.mark)}>
        {tone === "success" ? (
          <CheckIcon className="size-4" />
        ) : (
          <svg viewBox="0 0 16 16" className="size-4" style={{ transform: "none" }}>
            {tone === "info" ? (
              <>
                <path d="M8 7.25v4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="8" cy="4.5" r="1.15" fill="currentColor" />
              </>
            ) : (
              <>
                <path d="M8 3.75v5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="8" cy="11.75" r="1.15" fill="currentColor" />
              </>
            )}
          </svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        {title ? <Title className={cx("font-semibold leading-snug", Title === "p" ? "" : "text-lg font-bold", t.title)}>{title}</Title> : null}
        {body ? <div className={cx("text-ink-700", title ? "mt-1" : "")}>{body}</div> : null}
        {children}
        {action ? <div className="mt-3 flex flex-wrap items-center gap-3">{action}</div> : null}
      </div>
    </div>
  );
}

/* ---------------- Notice ---------------- */
/**
 * A boxed message inside the page flow (PLAYBOOK §9): what happened or what needs attention, one line of title, an optional
 * body and at most one action. The tone tints the box and its start-edge bar (so it mirrors in RTL); it never carries the
 * meaning alone, the title does. Pass `role="status"` when the notice appears after an action, `role="alert"` only for an
 * error the user must act on now. Not for toasts (Toast) or empty lists (EmptyState).
 */
export type NoticeTone = "info" | "success" | "warning" | "danger";
const noticeTones: Record<NoticeTone, string> = {
  info: "border-sky-500 bg-sky-100",
  success: "border-success bg-success/10",
  warning: "border-warning bg-gold-100",
  danger: "border-danger bg-danger/10",
};
export function Notice({
  tone = "info",
  title,
  body,
  action,
  role,
  id,
  className,
}: {
  tone?: NoticeTone;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  role?: "status" | "alert";
  id?: string;
  className?: string;
}) {
  return (
    <div
      id={id}
      role={role}
      className={cx(
        "flex flex-col items-start gap-3 rounded-[var(--radius-field)] border-s-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        noticeTones[tone],
        className,
      )}
    >
      <div className="min-w-0">
        <p className="font-semibold text-ink-900">{title}</p>
        {body ? <div className="mt-0.5 text-sm text-ink-700">{body}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ---------------- Notice ---------------- */
/**
 * A boxed message in the page flow (PLAYBOOK §9): a title that says what happened, an optional line under it and an optional
 * action. `info` gives context, `success` confirms something done, `warning` needs attention soon, `danger` says something failed.
 * The tone is never the only signal: the title carries the meaning in words (rule F5). Pass role="alert" when the notice appears
 * in answer to an action (a failed save) so screen readers hear it; leave it off for a notice that is there when the page opens.
 */
export type NoticeTone = "info" | "success" | "warning" | "danger";
const noticeTones: Record<NoticeTone, string> = {
  info: "border-sky-500/40 bg-sky-100",
  success: "border-success/40 bg-[#E4F4EC]",
  warning: "border-gold-300 bg-gold-100",
  danger: "border-danger bg-white",
};
export function Notice({
  tone = "info",
  title,
  body,
  action,
  role,
  className,
}: {
  tone?: NoticeTone;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  role?: "alert" | "status";
  className?: string;
}) {
  return (
    <div role={role} className={cx("flex flex-col gap-3 rounded-[var(--radius-field)] border p-4", noticeTones[tone], className)}>
      <div>
        <p className={cx("font-semibold", tone === "danger" ? "text-danger" : "text-ink-900")}>{title}</p>
        {body ? <p className="mt-0.5 text-sm text-ink-700">{body}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

/* ---------------- Notice ---------------- */
/**
 * A boxed message in the page flow (PLAYBOOK §9, the one notice box): a title, an optional body and at most one action. Tones:
 * info (sky), success (lagoon), warning (gold), danger (white with a danger border). Danger is announced at once (role alert,
 * e.g. a list that did not load); the others are polite status. For a change the person just made with Undo, use Toast.
 */
export type NoticeTone = "info" | "success" | "warning" | "danger";
const noticeTones: Record<NoticeTone, { box: string; title: string }> = {
  info: { box: "border-sky-500/40 bg-sky-100", title: "text-sea-900" },
  success: { box: "border-lagoon-600/40 bg-lagoon-100", title: "text-lagoon-900" },
  warning: { box: "border-gold-500/50 bg-gold-100", title: "text-ink-900" },
  danger: { box: "border-danger/60 bg-white", title: "text-danger" },
};
export function Notice({
  tone = "info",
  title,
  body,
  action,
  className,
}: {
  tone?: NoticeTone;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("rounded-[var(--radius-field)] border p-4", noticeTones[tone].box, className)}>
      <p className={cx("font-semibold", noticeTones[tone].title)}>{title}</p>
      {body ? <div className="mt-1 text-sm text-ink-700">{body}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
