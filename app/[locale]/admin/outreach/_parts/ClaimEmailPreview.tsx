// The claim email as the doctor will read it (screen 46 preview). The envelope lines (From, To, Subject, Preview text) are
// labelled in the admin's language; the message itself is in the email's language and direction, so an Arabic email reads
// right to left inside an English page and the reverse (rule E4: dir on the message, Arabic at 16 px or more, numbers and
// addresses in their own LTR runs). The button is drawn, not linked: there is no token until the invite is sent.
import Image from "next/image";
import type { ClaimEmailCopy } from "./types";

export type PreviewLabels = { from: string; to: string; subject: string; preheader: string; toEmpty: string };

export function ClaimEmailPreview({
  copy,
  to,
  personalLine,
  fromEmail,
  labels,
}: {
  copy: ClaimEmailCopy;
  to: string;
  personalLine: string;
  fromEmail: string;
  labels: PreviewLabels;
}) {
  const dir = copy.lang === "ar" ? "rtl" : "ltr";
  const line = personalLine.trim();
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-sand-300 bg-white">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-sand-200 bg-sand-100 px-4 py-3 text-sm">
        <dt className="font-semibold text-ink-700">{labels.from}</dt>
        {/* Envelope values follow the email's direction, as a mail app would show them; the empty To hint stays in the page's. */}
        <dd lang={copy.lang} dir={dir} className="min-w-0 text-start text-ink-900">
          {copy.fromName} <span className="ltr-run break-all text-ink-700">{`<${fromEmail}>`}</span>
        </dd>
        <dt className="font-semibold text-ink-700">{labels.to}</dt>
        {to.trim() ? (
          <dd dir={dir} className="min-w-0 text-start">
            <span className="ltr-run break-all text-ink-900">{to.trim()}</span>
          </dd>
        ) : (
          <dd className="min-w-0 text-ink-500">{labels.toEmpty}</dd>
        )}
        <dt className="font-semibold text-ink-700">{labels.subject}</dt>
        <dd lang={copy.lang} dir={dir} className="min-w-0 text-start font-semibold text-ink-900">
          {copy.subject}
        </dd>
        <dt className="font-semibold text-ink-700">{labels.preheader}</dt>
        <dd lang={copy.lang} dir={dir} className="min-w-0 text-start text-ink-700">
          {copy.preheader}
        </dd>
      </dl>

      <div lang={copy.lang} dir={dir} className="flex flex-col gap-4 px-5 py-6 text-start text-base leading-relaxed text-ink-900">
        <Image src="/brand/3affya_wordmark_transparent.png" alt="3affya" width={1479} height={492} className="h-8 w-auto self-start" />
        <h3 className="text-xl font-bold leading-snug text-sea-900">{copy.headline}</h3>
        {line ? (
          <figure className="rounded-[var(--radius-field)] border-s-4 border-lagoon-600 bg-sand-50 px-4 py-3">
            <figcaption className="text-sm font-semibold text-ink-700">{copy.noteFrom}</figcaption>
            <blockquote dir="auto" className="mt-1 whitespace-pre-line break-words text-ink-900">
              {line}
            </blockquote>
          </figure>
        ) : null}
        <p>{copy.intro}</p>
        <div className="rounded-[var(--radius-field)] bg-sand-100 p-4">
          <p className="text-sm font-semibold text-ink-700">{copy.factsTitle}</p>
          <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-[15px]">
            {copy.facts.map((f) => (
              <div key={f.label} className="contents">
                <dt className="text-ink-700">{f.label}</dt>
                <dd className="min-w-0 font-semibold">{f.ltr ? <span className="ltr-run tabular">{f.value}</span> : f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p>{copy.gives}</p>
        <p>{copy.scrutiny}</p>
        <span className="inline-flex min-h-12 items-center justify-center self-start rounded-[var(--radius-field)] bg-sea-700 px-5 py-3 text-[15px] font-semibold text-white"
        >
          {copy.button}
        </span>
        <p className="text-[15px] text-ink-700">{copy.expiry}</p>
        <div className="flex flex-col gap-2 border-t border-sand-200 pt-4 text-sm text-ink-700">
          <p>{copy.notMe}</p>
          <p>{copy.why}</p>
          <p>{copy.optOut}</p>
          <p className="text-ink-500">
            {copy.entity} {copy.address}
          </p>
        </div>
      </div>
    </div>
  );
}
