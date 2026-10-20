"use client";
// One professional's membership in the Sheet primitive (screen 42), opened by the URL (?doctor=<id>) so every state can be
// linked and reviewed: status, period, grace, last invoice and the Stripe Dashboard links, then the changes an admin can make,
// one level down from the table (rule A5). Each change names its outcome on the button; none asks for a confirmation, because
// each one can be undone from the notice that follows (rule B10). Closing the sheet returns to the list in the same view.
// Every string arrives formatted from the server (see shared.ts), so nothing here formats a date.
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge, Button, EmptyState, LinkButton, RadioCard, Sheet } from "@/components/ui";
import { changeMembership, type ChangeResult } from "../actions";
import { membersHref, type MemberDetailView, type MembershipChange, type MembersQuery } from "./shared";

const SHEET_ID = "member-sheet";

export function MemberSheet({ detail, query }: { detail: MemberDetailView | null; query: Pick<MembersQuery, "status" | "tz"> }) {
  const t = useTranslations("adminMembers");
  const tc = useTranslations("common");
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const leaving = useRef(false);
  const [months, setMonths] = useState(detail?.comp?.options[0]?.months ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<MembershipChange | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function close() {
    if (leaving.current) return;
    leaving.current = true;
    router.replace(membersHref(query), { scroll: false });
  }

  function run(change: MembershipChange, chosenMonths?: number) {
    if (!detail || busy) return;
    setError(null);
    setBusy(change);
    startTransition(async () => {
      let result: ChangeResult;
      try {
        result = await changeMembership(detail.doctorId, change, chosenMonths);
      } catch {
        result = { ok: false, error: "unavailable" };
      }
      if (!result.ok) {
        setError(t(`change.errors.${result.error}`));
        setBusy(null);
        return;
      }
      leaving.current = true;
      router.replace(membersHref({ ...query, changed: { doctorId: detail.doctorId, did: change, months: chosenMonths } }));
    });
  }

  const submitComp = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!detail?.comp?.options.some((o) => o.months === months)) {
      setError(t("change.errors.badMonths"));
      return;
    }
    run("comp", months);
  };

  const chosen = detail?.comp?.options.find((o) => o.months === months);
  const pending = (change: MembershipChange) => busy === change;
  const hasChanges = !!(detail?.comp || detail?.extend || detail?.cancel || detail?.resume);

  return (
    <Sheet ref={ref} id={SHEET_ID} title={detail?.name ?? t("detail.notFound.sheetTitle")} closeLabel={tc("close")} onClose={close}>
      {!detail ? (
        <EmptyState
          title={t("detail.notFound.title")}
          body={t("detail.notFound.body")}
          action={<LinkButton href="/admin/listings">{t("detail.notFound.action")}</LinkButton>}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="me-auto text-ink-700">{detail.specialty}</p>
            <Badge tone={detail.tone}>{detail.statusLabel}</Badge>
            {detail.free ? <Badge tone="info">{t("detail.freeBadge")}</Badge> : null}
          </div>
          <p className="text-ink-900">{detail.body}</p>

          <div>
            <dl className="divide-y divide-sand-200 border-y border-sand-200">
              {detail.facts.map((f) => (
                <div key={f.term} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
                  <dt className="text-ink-700">{f.term}</dt>
                  <dd className={`tabular text-end font-semibold ${f.warn ? "text-gold-700" : "text-ink-900"}`}>
                    {Array.isArray(f.value) ? (
                      f.value.map((part, i) => (
                        <span key={part}>
                          {i > 0 ? " · " : null}
                          <bdi>{part}</bdi>
                        </span>
                      ))
                    ) : f.ltr ? (
                      <span className="ltr-run">{f.value}</span>
                    ) : (
                      f.value
                    )}
                    {f.note ? <span className="block text-sm">{f.note}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-sm text-ink-500">
              {t("zone")} <span className="ltr-run">{detail.zone}</span>
            </p>
          </div>

          {hasChanges ? (
            <section aria-labelledby={`${SHEET_ID}-changes`} className="flex flex-col gap-4 border-t border-sand-200 pt-4">
              <h3 id={`${SHEET_ID}-changes`} className="text-lg font-bold text-sea-900">
                {t("change.title")}
              </h3>

              <div className="flex flex-col divide-y divide-sand-200 [&>*]:py-4 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
                {detail.comp ? (
                  <form onSubmit={submitComp} className="flex flex-col gap-3">
                    <fieldset className="flex min-w-0 flex-col gap-2">
                      <legend className="mb-1 font-semibold text-ink-900">
                        {t(detail.comp.start ? "change.comp.legendStart" : "change.comp.legend")}
                      </legend>
                      <p className="-mt-1 text-sm text-ink-700">{t(detail.comp.start ? "change.comp.hintStart" : "change.comp.hint")}</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {detail.comp.options.map((o) => (
                          <RadioCard
                            key={o.months}
                            name="months"
                            value={o.months}
                            title={o.label}
                            description={o.until}
                            checked={months === o.months}
                            onChange={() => setMonths(o.months)}
                          />
                        ))}
                      </div>
                    </fieldset>
                    <Button type="submit" variant="secondary" disabled={!!busy} className="w-full sm:w-auto sm:self-start">
                      {pending("comp") ? t("change.pending") : (chosen?.submit ?? t("change.comp.legend"))}
                    </Button>
                  </form>
                ) : null}

                {detail.extend ? (
                  <ChangeBlock
                    legend={t("change.extend.legend")}
                    hint={detail.extend.hint}
                    label={pending("extendGrace") ? t("change.pending") : detail.extend.submit}
                    disabled={!!busy}
                    onClick={() => run("extendGrace")}
                    variant="primary"
                  />
                ) : null}

                {detail.cancel ? (
                  <ChangeBlock
                    legend={t("change.cancel.legend")}
                    hint={detail.cancel.hint}
                    label={pending("cancelAtPeriodEnd") ? t("change.pending") : t("change.cancel.submit")}
                    disabled={!!busy}
                    onClick={() => run("cancelAtPeriodEnd")}
                    variant="secondary"
                  />
                ) : null}

                {detail.resume ? (
                  <ChangeBlock
                    legend={t("change.resume.legend")}
                    hint={detail.resume.hint}
                    label={pending("resume") ? t("change.pending") : t("change.resume.submit")}
                    disabled={!!busy}
                    onClick={() => run("resume")}
                    variant="primary"
                  />
                ) : null}
              </div>

              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
            </section>
          ) : null}

          <div className="flex flex-col gap-1 border-t border-sand-200 pt-4">
            {detail.stripeLinks.length ? (
              <>
                <h3 className="text-sm font-semibold text-ink-500">{t("detail.links")}</h3>
                <ul className="flex flex-wrap gap-x-5">
                  {detail.stripeLinks.map((l) => (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center font-semibold text-sea-700 underline-offset-2 hover:underline"
                      >
                        {l.label}
                        <span className="sr-only"> ({t("newTab")})</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <Link href={detail.profileHref} className="inline-flex min-h-11 items-center self-start font-semibold text-sea-700 underline-offset-2 hover:underline">
              {t("detail.profile")}
            </Link>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function ChangeBlock({
  legend,
  hint,
  label,
  disabled,
  onClick,
  variant,
}: {
  legend: string;
  hint: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
  variant: "primary" | "secondary";
}) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-semibold text-ink-900">{legend}</h4>
      <p className="-mt-1 text-sm text-ink-700">{hint}</p>
      <Button type="button" variant={variant} disabled={disabled} onClick={onClick} className="w-full sm:w-auto sm:self-start">
        {label}
      </Button>
    </div>
  );
}
