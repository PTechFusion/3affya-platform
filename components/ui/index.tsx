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

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx("w-full min-h-12 rounded-[var(--radius-field)] border border-sand-300 bg-white px-4 py-3 text-ink-900", className)}
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
export function CoachMark({ title, body }: { title: string; body: string }) {
  return (
    <div role="note" className="relative max-w-xs rounded-2xl bg-sea-900 px-4 py-3 text-white shadow-[var(--shadow-card)]">
      <span aria-hidden="true" className="absolute -top-2 start-6 size-4 rotate-45 bg-sea-900" />
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-white/85">{body}</p>
    </div>
  );
}

/* ---------------- Card surface ---------------- */
export function Surface({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-[var(--radius-card)] border border-sand-200 bg-white p-5", className)}>{children}</div>;
}

/* ---------------- Chip ---------------- */
/** Tappable pill for quick picks (specialty chips, quick replies). Wrap in a Link or button for the action. */
export function Chip({ tone = "sand", children }: { tone?: "sand" | "water"; children: ReactNode }) {
  const tones = {
    sand: "bg-sand-100 text-sea-800 hover:bg-sand-200",
    water: "bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25",
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
