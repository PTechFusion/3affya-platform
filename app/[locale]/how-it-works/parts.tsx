// Screen 3 local pieces: the step frame shared by the page and its loading state, plus the small step drawings and icons.
// Drawings use token colours only (fill-*/stroke-* utilities) and are never mirrored: none of them points a direction, and the
// magnifier and the checkmark must not flip (rule R2).
import type { ReactNode } from "react";
import { Surface } from "@/components/ui";

/** One step: number, title and drawing on one row, the one-line body at full width under it, optional extras inside the card
 *  (`extra`) and the step's detail panel directly under the card (`children`), so the detail stays one level down (rule X5). */
export function StepFrame({
  number,
  title,
  body,
  art,
  extra,
  children,
}: {
  number: string;
  title: string;
  body: ReactNode;
  art: ReactNode;
  extra?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3">
      <Surface className="sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <span aria-hidden="true" className="tabular inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-lagoon-600 text-lg font-bold text-white">
            {number}
          </span>
          <h2 className="min-w-0 flex-1 text-xl font-bold leading-snug text-sea-900 sm:text-2xl">{title}</h2>
          <div className="shrink-0">{art}</div>
        </div>
        <div className="mt-2 text-ink-700 sm:ps-14">{body}</div>
        {extra ? <div className="sm:ps-14">{extra}</div> : null}
      </Surface>
      {children}
    </li>
  );
}

const artClass = "size-12 sm:size-16";

/** Step 1: a profile card under a magnifier. */
export function FindArt() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={artClass}>
      <rect x="6" y="10" width="40" height="44" rx="7" className="fill-sand-200" />
      <circle cx="18" cy="23" r="6" className="fill-lagoon-100" />
      <rect x="27" y="19" width="13" height="3.5" rx="1.75" className="fill-sand-400" />
      <rect x="27" y="25" width="9" height="3.5" rx="1.75" className="fill-sand-400" />
      <rect x="12" y="35" width="26" height="3.5" rx="1.75" className="fill-sand-400" />
      <rect x="12" y="42" width="18" height="3.5" rx="1.75" className="fill-sand-400" />
      <circle cx="42" cy="38" r="11" className="fill-white/60 stroke-lagoon-600" strokeWidth="4" />
      <path d="M50 46l8 8" className="stroke-lagoon-600" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** Step 2: a calendar page with a checkmark. */
export function BookArt() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={artClass}>
      <rect x="8" y="12" width="48" height="44" rx="8" className="fill-sand-100 stroke-sand-300" strokeWidth="2" />
      <path d="M8 20a8 8 0 0 1 8-8h32a8 8 0 0 1 8 8v4H8z" className="fill-lagoon-600" />
      <rect x="18" y="6" width="5" height="12" rx="2.5" className="fill-sea-800" />
      <rect x="41" y="6" width="5" height="12" rx="2.5" className="fill-sea-800" />
      <circle cx="32" cy="40" r="10" className="fill-lagoon-100" />
      <path d="M27 40.5l3.5 3.5 7-7" fill="none" className="stroke-sea-700" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Step 3: a call window with the doctor and a speech bubble. */
export function TalkArt() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={artClass}>
      <rect x="4" y="12" width="44" height="34" rx="7" className="fill-lagoon-100 stroke-lagoon-600" strokeWidth="2" />
      <circle cx="26" cy="25" r="6" className="fill-lagoon-600" />
      <path d="M14 46c1.5-7 6-11 12-11s10.5 4 12 11z" className="fill-lagoon-600" />
      <path d="M38 34h18a5 5 0 0 1 5 5v9a5 5 0 0 1-5 5h-8l-6 5v-5h-4a5 5 0 0 1-5-5v-9a5 5 0 0 1 5-5z" className="fill-sand-300" />
      <circle cx="43" cy="43.5" r="2" className="fill-sea-800" />
      <circle cx="49" cy="43.5" r="2" className="fill-sea-800" />
      <circle cx="55" cy="43.5" r="2" className="fill-sea-800" />
    </svg>
  );
}

export function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
      <rect x="2.5" y="6" width="13" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.5 10.5l5-3v9l-5-3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
      <path
        d="M6.6 3.5l2.6.4 1.3 4-1.9 1.6a12 12 0 0 0 5.9 5.9l1.6-1.9 4 1.3.4 2.6a2 2 0 0 1-2 2.3A16.5 16.5 0 0 1 4.3 5.5a2 2 0 0 1 2.3-2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 shrink-0">
      <path d="M12 3.5l9.5 16.5h-19z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 10v4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17.25" r="1.2" fill="currentColor" />
    </svg>
  );
}
