// Small pieces both profile variants share: the section heading style, a label/value row, the breadcrumb and a verifier link.
import type { ReactNode } from "react";

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

