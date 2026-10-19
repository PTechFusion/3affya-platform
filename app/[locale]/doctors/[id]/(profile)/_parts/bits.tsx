// Small pieces both profile variants share: the section heading style, a label/value row, the breadcrumb and a verifier link.
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronNext } from "@/components/ui";

export const sectionTitle = "text-xl font-bold text-sea-900";

/** One fact: label at the reading start, value beside it (rule R4: labels follow the page direction, values isolate their own).
 *  `stack` puts long values (board names, training) under their label on phone so they get the full width. */
export function Row({ label, stack, children }: { label: string; stack?: boolean; children: ReactNode }) {
  return (
    <div
      className={
        stack
          ? "grid gap-1 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4"
          : "grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4"
      }
    >
      <dt className="text-sm font-semibold text-ink-500">{label}</dt>
      <dd className="min-w-0 text-ink-900">{children}</dd>
    </div>
  );
}

/** Public lookup for a credential claim (rules C8, X3). Opens the verifier's own site. */
export function VerifierLink({ href, domain, lead }: { href: string; domain: string; lead: string }) {
  return (
    <p className="mt-1 text-sm">
      <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-sea-700 underline-offset-2 hover:underline">
        {lead} <span className="ltr-run">{domain}</span>
      </a>
    </p>
  );
}

/** Doctors > specialty > this doctor (rule S15). Hidden on phone so the card, price and times keep the first screen. */
export function Breadcrumbs({ label, doctors, specialty, specialtyHref, current }: { label: string; doctors: string; specialty: string; specialtyHref: string; current: string }) {
  return (
    <nav aria-label={label} className="mb-5 hidden text-sm sm:block">
      <ol className="flex flex-wrap items-center gap-1.5 text-ink-500">
        <li>
          <Link href="/search" className="hover:text-sea-700 hover:underline">
            {doctors}
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronNext className="size-3.5" />
        </li>
        <li>
          <Link href={specialtyHref} className="hover:text-sea-700 hover:underline">
            {specialty}
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronNext className="size-3.5" />
        </li>
        <li aria-current="page" className="font-semibold text-ink-700">
          {current}
        </li>
      </ol>
    </nav>
  );
}
