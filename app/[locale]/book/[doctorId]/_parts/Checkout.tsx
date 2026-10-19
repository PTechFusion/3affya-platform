"use client";
// Screen 20, checkout's interactive part: the hold bar pinned under the site nav (the hook), the details and agreements the
// picker did not ask (rules F10, P5, P9, T12) and the one Pay action. The review block and the three fee lines arrive rendered
// from the server. Stripe hosts the card and wallet fields (ADR-6), so there is no card form here: the payment box says who
// takes the payment and which methods work (P3, P12), and Pay hands over to Stripe.
// Phases: idle; paying (a step list, never a blank spinner, L1 T11); failed (card declined) and error (service down), both
// keeping every answer (P4); expired (the hold ran out: hold it again in place); gone (the time passed).
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, CheckCard, CheckIcon, ClockIcon, Field, Input, LinkButton, LockIcon, Select } from "@/components/ui";
import { formatNumber, type Locale } from "@/lib/format";
import { renewHold, startPayment } from "./actions";
import { bookingQuery, draftKey, type Keep, type VisitType } from "./booking";
import {
  DETAIL_FIELDS,
  DIAL_CODES,
  LOCATIONS,
  dialFor,
  nationalDigits,
  validateDetails,
  type DetailErrors,
  type DetailField,
  type Details,
} from "./details";
import { focusFirstError } from "./fields";
import { HoldCountdown } from "./HoldCountdown";

export type CheckoutPhase = "idle" | "paying" | "failed" | "error" | "expired" | "gone" | "missing";

type Props = {
  doctor: { id: string; name: string; gender: "f" | "m" };
  patientName: string;
  slot: string;
  answers: { visit: VisitType | ""; forWhom: string; ageGroup: string };
  missing: boolean;
  hold: { heldUntil: string; remainingMs: number };
  warnMs: number;
  initialPhase: CheckoutPhase;
  initialDetails: Details;
  total: string;
  cutoffLabel: string;
  emergencyNumber: string;
  pickerHref: string;
  keep: Keep;
  header: React.ReactNode;
  review: React.ReactNode;
  fees: React.ReactNode;
};

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(" ");
const id = (f: DetailField) => `book-${f}`;

export function Checkout(p: Props) {
  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const loc = useLocale() as Locale;
  const router = useRouter();
  const [details, setDetails] = useState<Details>(p.initialDetails);
  const [errors, setErrors] = useState<DetailErrors>({});
  const [phase, setPhase] = useState<CheckoutPhase>(p.hold.remainingMs <= 0 ? "expired" : p.initialPhase);
  const [hold, setHold] = useState(p.hold);
  const [holdKey, setHoldKey] = useState(0);
  const [warn, setWarn] = useState(p.hold.remainingMs > 0 && p.hold.remainingMs <= p.warnMs);
  const [announce, setAnnounce] = useState("");
  const [, startTransition] = useTransition();
  const [renewing, setRenewing] = useState(false);

  const expired = phase === "expired";
  const warnMinutes = Math.round(p.warnMs / 60_000);

  const set = <K extends keyof Details>(key: K, value: Details[K]) => {
    setDetails((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!e[key as DetailField]) return e;
      const next = { ...e };
      delete next[key as DetailField];
      return next;
    });
  };

  const errorText = (f: DetailField): string | undefined => {
    const code = errors[f];
    if (!code) return undefined;
    if (f === "phone" && code === "length") {
      const dial = dialFor(details.phoneCountry);
      return t("errors.phone.length", {
        code: dial.code,
        digits: dial.digits.map((n) => formatNumber(n, loc)).join(loc === "ar" ? " أو " : " or "),
        count: formatNumber(nationalDigits(details.phone).length, loc),
      });
    }
    return t(`errors.${f}.${code}`);
  };

  const pay = () => {
    if (p.missing) {
      setPhase("missing");
      return;
    }
    const found = validateDetails(details);
    setErrors(found);
    if (Object.keys(found).length) {
      focusFirstError(DETAIL_FIELDS, found);
      return;
    }
    setPhase("paying");
    startTransition(async () => {
      try {
        const r = await startPayment({ doctorId: p.doctor.id, slot: p.slot, heldUntil: hold.heldUntil, ...p.answers, ...details });
        if (r.ok) {
          try {
            window.sessionStorage.removeItem(draftKey(p.doctor.id));
          } catch {
            /* nothing stored, nothing to clear */
          }
          // Screen 21 is the separate confirmation (rule P2); production gets there from Stripe's return URL.
          router.push(`/patient/bookings/${r.bookingId}${bookingQuery({ extra: { state: "confirmed" }, keep: p.keep })}`);
          return;
        }
        if (r.error === "validation") {
          setErrors(r.fields);
          setPhase("idle");
          focusFirstError(DETAIL_FIELDS, r.fields);
        } else if (r.error === "expired") setPhase("expired");
        else if (r.error === "passed" || r.error === "notBookable") setPhase("gone");
        else if (r.error === "missingAnswers") setPhase("missing");
        else if (r.error === "declined") setPhase("failed");
        else setPhase("error");
      } catch {
        setPhase("error");
      }
    });
  };

  const holdAgain = () => {
    setRenewing(true);
    startTransition(async () => {
      try {
        const r = await renewHold({ doctorId: p.doctor.id, slot: p.slot });
        if (r.ok) {
          setHold({ heldUntil: r.heldUntil, remainingMs: r.holdMs });
          setHoldKey((k) => k + 1);
          setWarn(false);
          setPhase("idle");
          setAnnounce(t("hold.renewed"));
        } else setPhase("gone");
      } catch {
        setPhase("error");
      } finally {
        setRenewing(false);
      }
    });
  };

  const barTone = expired ? "border-sand-300 bg-sand-200 text-ink-900" : warn ? "border-gold-300 bg-gold-100 text-gold-700" : "border-lagoon-300 bg-lagoon-100 text-lagoon-900";
  const phoneVisit = p.answers.visit === "phone";
  const link = "font-semibold text-sea-700 underline-offset-2 hover:underline";

  return (
    <>
      {/* The hook: the hold timer in the sticky header, with the total beside it so price and time stay in view (P1). */}
      <div className={cx("sticky top-16 z-10 border-b sm:top-20", barTone)}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <ClockIcon className="size-5 shrink-0" />
            {expired ? (
              <span>{t("hold.expired")}</span>
            ) : (
              <span>
                {t("hold.label")}{" "}
                <HoldCountdown
                  key={holdKey}
                  remainingMs={hold.remainingMs}
                  warnMs={p.warnMs}
                  className="text-base"
                  onWarn={() => {
                    setWarn(true);
                    setAnnounce(t("hold.announceWarn", { minutes: warnMinutes, minutesLabel: formatNumber(warnMinutes, loc) }));
                  }}
                  onExpire={() => {
                    setPhase((ph) => (ph === "paying" ? ph : "expired"));
                    setAnnounce(t("hold.announceExpired"));
                  }}
                />
              </span>
            )}
          </p>
          <p className="shrink-0 text-sm">
            <span className="sr-only sm:not-sr-only">{t("hold.total")} </span>
            <span className="tabular font-bold">{p.total}</span>
          </p>
        </div>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      <main className="mx-auto max-w-6xl px-4 pb-14 pt-4 sm:px-6 sm:pt-6">
        {p.header}
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-x-12">
          <div className="flex min-w-0 flex-col gap-6">
            {p.review}

            {/* Between the blocks (layout call): where the patient will be, a phone the doctor can call, the agreements. */}
            <section aria-labelledby="details-title" className="rounded-[var(--radius-card)] border border-sand-200 bg-white p-5">
              <h2 id="details-title" className="text-xl font-bold text-sea-900">
                {t("details.title")}
              </h2>
              <p className="mt-1 text-sm text-ink-700">{t("details.bookingAs", { name: p.patientName })}</p>

              <div className="mt-4 flex flex-col gap-5">
                <Field id={id("location")} label={t("details.location.label")} hint={t("details.location.hint")} error={errorText("location")}>
                  <Select
                    id={id("location")}
                    value={details.location}
                    onChange={(e) => set("location", e.target.value as Details["location"])}
                    invalid={Boolean(errors.location)}
                    aria-describedby={`${id("location")}-${errors.location ? "error" : "hint"}`}
                  >
                    <option value="">{t("details.location.placeholder")}</option>
                    {LOCATIONS.map((c) => (
                      <option key={c} value={c}>
                        {t(`countries.${c}`)}
                      </option>
                    ))}
                  </Select>
                </Field>

                {/* Rule F10: Gulf codes first, the number typed left to right, its length checked for the chosen country. */}
                <Field
                  id={id("phone")}
                  label={phoneVisit ? t("details.phone.labelPhone") : t("details.phone.labelVideo")}
                  hint={t(phoneVisit ? "details.phone.hintPhone" : "details.phone.hintVideo", { name: p.doctor.name, gender: p.doctor.gender })}
                  error={errorText("phone")}
                >
                  <div dir="ltr" className="flex gap-2">
                    <div className="w-44 shrink-0">
                      <Select
                        dir="ltr"
                        aria-label={t("details.phone.code")}
                        value={details.phoneCountry}
                        onChange={(e) => set("phoneCountry", dialFor(e.target.value).country)}
                      >
                        {DIAL_CODES.map((d) => (
                          <option key={d.country} value={d.country}>
                            {`${d.code} ${t(`dialNames.${d.country}`)}`}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Input
                      id={id("phone")}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      dir="ltr"
                      value={details.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      onBlur={() => details.phone && setErrors((e) => ({ ...e, phone: validateDetails(details).phone }))}
                      invalid={Boolean(errors.phone)}
                      aria-describedby={`${id("phone")}-${errors.phone ? "error" : "hint"}`}
                      className="tabular"
                    />
                  </div>
                </Field>

                <fieldset>
                  <legend className="mb-2 text-[15px] font-semibold text-ink-900">{t("details.consent.legend")}</legend>
                  <div className="flex flex-col gap-4">
                    {/* Rule P9: telehealth consent in the flow, before the first visit; production records when and how. */}
                    <div>
                      <CheckCard
                        id={id("telehealth")}
                        title={t("details.consent.telehealthTitle")}
                        description={t("details.consent.telehealthBody", { name: p.doctor.name, gender: p.doctor.gender })}
                        checked={details.telehealth}
                        onChange={(e) => set("telehealth", e.target.checked)}
                        aria-invalid={Boolean(errors.telehealth) || undefined}
                        aria-describedby={errors.telehealth ? `${id("telehealth")}-error` : undefined}
                      />
                      <p className="mt-1.5 text-sm">
                        <Link href="/terms#visits" className={link}>
                          {t("details.consent.telehealthLink")}
                        </Link>
                      </p>
                      {errors.telehealth ? (
                        <p id={`${id("telehealth")}-error`} role="alert" className="mt-1 text-sm text-danger">
                          {errorText("telehealth")}
                        </p>
                      ) : null}
                    </div>
                    {/* Rule P5: the cancellation terms on this step, not only in the terms. */}
                    <div>
                      <CheckCard
                        id={id("cancellation")}
                        title={t("details.consent.cancelTitle")}
                        description={t("details.consent.cancelBody", { cutoff: p.cutoffLabel })}
                        checked={details.cancellation}
                        onChange={(e) => set("cancellation", e.target.checked)}
                        aria-invalid={Boolean(errors.cancellation) || undefined}
                        aria-describedby={errors.cancellation ? `${id("cancellation")}-error` : undefined}
                      />
                      <p className="mt-1.5 text-sm">
                        <Link href="/refunds" className={link}>
                          {t("details.consent.cancelLink")}
                        </Link>
                      </p>
                      {errors.cancellation ? (
                        <p id={`${id("cancellation")}-error`} role="alert" className="mt-1 text-sm text-danger">
                          {errorText("cancellation")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </fieldset>

                {/* Rule T12: confidentiality in plain words at booking; H14: not for emergencies, with the local number. */}
                <div className="flex flex-col gap-2 rounded-[var(--radius-field)] bg-sand-100 p-4 text-sm text-ink-700">
                  <p className="flex items-start gap-2">
                    <LockIcon className="mt-0.5 size-4 shrink-0 text-sea-700" />
                    <span>
                      {t("details.privacy", { name: p.doctor.name })}{" "}
                      <Link href="/privacy" className={link}>
                        {t("details.privacyLink")}
                      </Link>
                    </span>
                  </p>
                  <p>{tc("notForEmergenciesWithNumber", { number: p.emergencyNumber })}</p>
                </div>
              </div>
            </section>
          </div>

          <section aria-labelledby="pay-title" className="flex flex-col gap-4 lg:sticky lg:top-36">
            <h2 id="pay-title" className="text-xl font-bold text-sea-900">
              {t("pay.title")}
            </h2>
            {p.fees}

            {/* Rule P3: the payment box with its security cues; P12: the methods said up front, wallets first. */}
            <div className="rounded-[var(--radius-card)] border-2 border-sand-300 bg-white p-5">
              <p className="flex items-center gap-2 font-semibold text-ink-900">
                <LockIcon className="size-5 shrink-0 text-success" />
                {t("pay.secured")}
              </p>
              <p className="mt-1 text-sm text-ink-700">{t("pay.stripeBody")}</p>
              <ul aria-label={t("pay.methods")} className="mt-3 flex flex-wrap gap-2">
                {(["applePay", "googlePay", "visa", "mastercard"] as const).map((m) => (
                  <li key={m}>
                    <span lang="en" dir="ltr" className="inline-flex min-h-8 items-center rounded-[var(--radius-field)] border border-sand-300 bg-sand-50 px-3 text-sm font-semibold text-ink-900">
                      {t(`pay.method.${m}`)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-500">{t("pay.mada")}</p>
            </div>

            <PayArea
              phase={phase}
              total={p.total}
              pickerHref={p.pickerHref}
              onPay={pay}
              onHoldAgain={holdAgain}
              renewing={renewing}
            />
            <p className="text-sm text-ink-700">{t("pay.captureNote")}</p>
          </section>
        </div>
      </main>
    </>
  );
}

function PayArea({
  phase,
  total,
  pickerHref,
  onPay,
  onHoldAgain,
  renewing,
}: {
  phase: CheckoutPhase;
  total: string;
  pickerHref: string;
  onPay: () => void;
  onHoldAgain: () => void;
  renewing: boolean;
}) {
  const t = useTranslations("checkout");
  const payButton = (
    <Button size="lg" className="w-full" onClick={onPay}>
      {t("pay.button", { amount: total })}
    </Button>
  );
  if (phase === "paying") return <PaySteps />;
  if (phase === "expired") {
    return (
      <Notice tone="warning" title={t("pay.expiredTitle")} body={t("pay.expiredBody")}>
        <Button size="lg" className="w-full" onClick={onHoldAgain} disabled={renewing} aria-busy={renewing || undefined}>
          {renewing ? t("pay.holdingAgain") : t("pay.holdAgain")}
        </Button>
      </Notice>
    );
  }
  if (phase === "gone") {
    return (
      <Notice tone="warning" title={t("pay.goneTitle")} body={t("pay.goneBody")}>
        <LinkButton href={pickerHref} size="lg" className="w-full">
          {t("pay.chooseAnother")}
        </LinkButton>
      </Notice>
    );
  }
  if (phase === "missing") {
    return (
      <Notice tone="warning" title={t("review.missingTitle")} body={t("review.missingBody")}>
        <LinkButton href={pickerHref} size="lg" className="w-full">
          {t("review.missingAction")}
        </LinkButton>
      </Notice>
    );
  }
  if (phase === "failed" || phase === "error") {
    return (
      <Notice tone="danger" title={t(phase === "failed" ? "pay.failedTitle" : "pay.errorTitle")} body={t(phase === "failed" ? "pay.failedBody" : "pay.errorBody")}>
        {payButton}
      </Notice>
    );
  }
  return payButton;
}

/** Rules L1 and T11: while Stripe takes the payment, the steps show the work; nothing moves backwards. */
function PaySteps() {
  const t = useTranslations("checkout");
  const steps = [
    { key: "held", state: "done" },
    { key: "paying", state: "current" },
    { key: "confirming", state: "waiting" },
  ] as const;
  return (
    <ol role="status" aria-label={t("pay.steps.label")} className="flex flex-col gap-3 rounded-[var(--radius-field)] border border-sand-200 bg-white p-4">
      {steps.map((s) => (
        <li key={s.key} className="flex items-center gap-3">
          {s.state === "done" ? (
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <CheckIcon className="size-4" />
            </span>
          ) : s.state === "current" ? (
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-lagoon-600">
              <span className="size-3 rounded-full bg-lagoon-600 motion-safe:animate-pulse" />
            </span>
          ) : (
            <span className="size-7 shrink-0 rounded-full border-2 border-sand-300" />
          )}
          <span className={s.state === "current" ? "font-semibold text-ink-900" : s.state === "done" ? "text-ink-700" : "text-ink-500"}>
            {t(`pay.steps.${s.key}`)}
            <span className="sr-only">, {t(`pay.steps.${s.state}`)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Notice({ tone, title, body, children }: { tone: "warning" | "danger"; title: string; body: string; children?: React.ReactNode }) {
  return (
    <div role="alert" className={cx("flex flex-col gap-3 rounded-[var(--radius-field)] border p-4", tone === "danger" ? "border-danger bg-white" : "border-gold-300 bg-gold-100")}>
      <div>
        <p className="font-semibold text-ink-900">{title}</p>
        <p className="mt-0.5 text-sm text-ink-700">{body}</p>
      </div>
      {children}
    </div>
  );
}
