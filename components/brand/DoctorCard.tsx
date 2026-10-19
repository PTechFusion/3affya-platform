"use client";
// The one DoctorCard. Renders the builder preview, search rows, the profile header and the ID card image.
// Front: beach sand, name and identity. Back: lagoon, the details. Same card for every doctor (Dr Ayman, 17 Oct).
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatNumber, type Locale } from "@/lib/format";
import { Badge, Button, CheckIcon, LinkButton } from "@/components/ui";

export type DoctorCardState = "unclaimed" | "pending" | "verified";

export type DoctorCardData = {
  nameEn: string;
  nameAr: string;
  specialtyEn: string;
  specialtyAr: string;
  cityEn: string;
  cityAr: string;
  photoUrl?: string;
  languages: string;
  visitTypes: Array<"video" | "phone">;
  ages: "adults" | "children" | "allAges";
  tags: string[];
  trainingLines: string[];
  yearsInPractice?: number;
  feeLabel?: string; // already formatted via lib/format
  nextAvailableLabel?: string; // already formatted in the viewer's zone
  verifiedOnLabel?: string;
  boardCertified?: boolean;
};

type Props = {
  doctor: DoctorCardData;
  state: DoctorCardState;
  /** "row" is the one-doctor-per-row list layout for search results (rule S14): same data and badges, no flip. */
  size?: "full" | "mini" | "row";
  /** Force a side (used by the ID card renderer and the brand page). */
  side?: "front" | "back";
  onBook?: () => void;
  /** Book on the back face as a link to this path (navigation is a link, not a button). Takes precedence over onBook. */
  bookHref?: string;
  /** False hides Book: the doctor cannot take bookings now (no published times, payouts not ready). */
  bookable?: boolean;
  /** Row only: the profile the whole row opens (rule C2). */
  href?: string;
  /** Row only: the action in the end panel. Verified rows label it Book; pass a label for other states. */
  action?: { href: string; label?: string };
  /** Row only: a qualifier after the price label, e.g. that the price includes every fee (rule C5). */
  priceNote?: string;
  /** The practice ID card image (screen 31): the 3affya wordmark on both faces, no Book and no next-available line (a saved
   *  image would keep showing a time that has passed). Pair it with `side`. */
  idCard?: boolean;
  /** Text stamped across both faces, e.g. Unverified on an ID card until the credentials are approved (rules C8, A2). */
  watermark?: string;
};

export function DoctorCard({
  doctor,
  state,
  size = "full",
  side,
  onBook,
  bookHref,
  bookable = true,
  href,
  action,
  priceNote,
  idCard = false,
  watermark,
}: Props) {
  const t = useTranslations("card");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [flipped, setFlipped] = useState(false);
  const showBack = side ? side === "back" : flipped;
  const name = locale === "ar" ? doctor.nameAr : doctor.nameEn;
  const altName = locale === "ar" ? doctor.nameEn : doctor.nameAr;
  const specialty = locale === "ar" ? doctor.specialtyAr : doctor.specialtyEn;
  const city = locale === "ar" ? doctor.cityAr : doctor.cityEn;
  const mini = size === "mini";
  const canBook = bookable && !idCard; // an image has no buttons

  const stateBadge =
    state === "verified" ? (
      <Badge tone="verified">{doctor.verifiedOnLabel ? t("verifiedOn", { date: doctor.verifiedOnLabel }) : t("verified")}</Badge>
    ) : state === "pending" ? (
      <Badge tone="pending">{t("pending")}</Badge>
    ) : (
      <Badge tone="unclaimed">{t("unclaimed")}</Badge>
    );

  if (size === "row") {
    return (
      <DoctorRow
        doctor={doctor}
        state={state}
        name={name}
        altName={altName}
        specialty={specialty}
        city={city}
        stateBadge={stateBadge}
        href={href}
        action={action ? { href: action.href, label: action.label ?? tc("book") } : undefined}
        priceNote={priceNote}
        canBook={bookable}
      />
    );
  }

  // The faces are plain divs (a card-wide <button> would nest the Book button inside it, which is invalid HTML and breaks
  // hydration). Tapping anywhere flips; this small control is the keyboard and screen-reader route.
  const flipControl = side ? null : (
    <button
      type="button"
      aria-pressed={showBack}
      onClick={(e) => {
        e.stopPropagation();
        setFlipped((f) => !f);
      }}
      className={[
        "ms-auto inline-flex min-h-8 items-center rounded-[var(--radius-tag)] px-2.5 text-[12px] font-semibold",
        showBack ? "bg-white/15 text-white hover:bg-white/25" : "bg-white/60 text-sea-800 hover:bg-white",
      ].join(" ")}
    >
      {showBack ? t("front") : t("tapToFlip")}
    </button>
  );

  const Front = (
    <div
      data-card-face="front"
      className={[
        "flex h-full flex-col rounded-[var(--radius-card)] border-b-[10px] border-lagoon-600 text-ink-900 shadow-[var(--shadow-card)]",
        mini ? "p-3" : "p-5 sm:p-6",
        side === "front" ? "flex-1" : "",
        watermark ? "relative isolate overflow-hidden" : "",
      ].join(" ")}
      style={{ background: "linear-gradient(135deg, #EFEBE2, #DBD3BF 60%, #C6BEAC)" }}
    >
      <div className="flex items-start gap-3">
        {doctor.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doctor.photoUrl}
            alt=""
            className={[mini ? "size-12" : "size-20 sm:size-24", "shrink-0 rounded-2xl object-cover ring-4 ring-white/70"].join(" ")}
          />
        ) : (
          <div
            aria-hidden="true"
            className={[mini ? "size-12" : "size-20 sm:size-24", "shrink-0 rounded-2xl bg-sand-50/80 ring-4 ring-white/70"].join(" ")}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className={[mini ? "text-base" : "text-xl sm:text-2xl", "font-bold leading-tight"].join(" ")}>{name}</p>
          <p className="ltr-run text-sm text-ink-700" dir="auto">
            {altName}
          </p>
          <p className={[mini ? "text-sm" : "text-base", "mt-1 font-semibold text-sea-800"].join(" ")}>{specialty}</p>
          <p className="text-sm text-ink-700">{city}</p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
        {stateBadge}
        {doctor.boardCertified && state === "verified" ? (
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-gold-700" title={t("boardCertifiedHint")}>
            <CheckIcon /> {t("boardCertified")}
          </span>
        ) : null}
        {flipControl}
        {idCard ? <CardWordmark /> : null}
      </div>
      {watermark ? <Watermark text={watermark} face="front" /> : null}
    </div>
  );

  const Back = (
    <div
      data-card-face="back"
      className={[
        "flex h-full flex-col rounded-[var(--radius-card)] text-white shadow-[var(--shadow-card)]",
        mini ? "p-3" : "p-5 sm:p-6",
        watermark ? "relative isolate overflow-hidden" : "",
      ].join(" ")}
      style={{ background: "linear-gradient(135deg, #065E78, #08708E 45%, #0194BE 80%, #02B3CA)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={[mini ? "text-base" : "text-lg", "font-bold"].join(" ")}>{name}</p>
        {flipControl}
      </div>
      <dl className={["mt-1.5 grid gap-x-4 gap-y-1", mini ? "text-xs" : "text-[13px]", "grid-cols-[auto_1fr]"].join(" ")}>
        <dt className="text-white/75">{t("languages")}</dt>
        <dd>{doctor.languages}</dd>
        {doctor.visitTypes.length ? (
          <>
            <dt className="text-white/75">{t("visitTypes")}</dt>
            <dd>{doctor.visitTypes.map((v) => t(v)).join(" · ")}</dd>
          </>
        ) : null}
        <dt className="text-white/75">{t("ages")}</dt>
        <dd>{t(doctor.ages)}</dd>
        {state !== "unclaimed" && doctor.trainingLines.length ? (
          <>
            <dt className="text-white/75">{t("training")}</dt>
            {/* The back has a fixed flip height: training is held to two lines and the tags to one row so the fee, the next
                time and Book never spill out of the card. The profile page lists both in full. */}
            <dd className="line-clamp-2">{doctor.trainingLines.join(" · ")}</dd>
          </>
        ) : null}
        {doctor.yearsInPractice ? (
          <>
            <dt className="text-white/75" />
            <dd className="font-semibold">{t("yearsInPractice", { years: doctor.yearsInPractice, yearsLabel: formatNumber(doctor.yearsInPractice, locale as Locale) })}</dd>
          </>
        ) : null}
      </dl>
      {doctor.tags.length ? (
        <div className="mt-3 flex max-h-7 flex-wrap gap-1.5 overflow-hidden">
          {doctor.tags.slice(0, mini ? 3 : 6).map((tag) => (
            <span key={tag} className="rounded-[var(--radius-tag)] bg-white/15 px-2.5 py-0.5 text-[12.5px] font-medium">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div>
          {state === "verified" && doctor.feeLabel ? (
            <>
              <p className="text-xs text-white/75">{t("fee")}</p>
              <p className="tabular text-xl font-bold">{doctor.feeLabel}</p>
            </>
          ) : (
            <p className="text-xs text-white/75">{state === "unclaimed" ? t("unclaimedHint") : t("noAvailability")}</p>
          )}
          {state === "verified" && !idCard ? (
            <p className="text-xs text-white/85">
              {t("nextAvailable")}: <span className="tabular">{doctor.nextAvailableLabel ?? t("noAvailability")}</span>
            </p>
          ) : null}
        </div>
        {state === "verified" && !mini && canBook && bookHref ? (
          <LinkButton
            href={bookHref}
            variant="secondary"
            className="border-white bg-white text-lagoon-900"
            onClick={(e) => e.stopPropagation()}
          >
            {tc("book")}
          </LinkButton>
        ) : state === "verified" && !mini && canBook ? (
          <Button
            variant="secondary"
            className="border-white bg-white text-lagoon-900"
            onClick={(e) => {
              e.stopPropagation();
              onBook?.();
            }}
          >
            {tc("book")}
          </Button>
        ) : null}
        {idCard ? <CardWordmark plate /> : null}
      </div>
      {watermark ? <Watermark text={watermark} face="back" /> : null}
    </div>
  );

  return (
    <div className={["relative w-full", mini ? "max-w-xs" : "max-w-md"].join(" ")} style={{ perspective: "1400px" }}>
      <div
        onClick={() => !side && setFlipped((f) => !f)}
        className="w-full text-start"
        style={{ transformStyle: "preserve-3d", transition: "transform .55s cubic-bezier(.2,.8,.2,1)", transform: showBack ? "rotateY(180deg)" : "none" }}
      >
        {/* A card forced to its front never flips, so it may grow with its content (a long Arabic name, the two badges on a
            second line) instead of spilling out of the fixed flip height. */}
        <div
          className={side === "front" ? ["flex flex-col", mini ? "min-h-40" : "min-h-[356px]"].join(" ") : mini ? "h-40" : "h-[356px]"}
          style={{ backfaceVisibility: "hidden" }}
        >
          {Front}
        </div>
        <div
          className={["absolute inset-0", mini ? "h-40" : "h-[356px]"].join(" ")}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {Back}
        </div>
      </div>
    </div>
  );
}

/** The 3affya wordmark on the ID card faces, at the reading-end corner. Never mirrored (rule R2). On the lagoon back it sits on
 *  a sand plate, as the on-dark logo does. */
function CardWordmark({ plate }: { plate?: boolean }) {
  return (
    <span className={["ms-auto inline-flex shrink-0", plate ? "rounded-[var(--radius-field)] bg-sand-50 px-2.5 py-1.5" : ""].join(" ")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/3affya_wordmark_transparent.png" alt="3affya" width={1479} height={492} className={plate ? "h-6 w-auto" : "h-7 w-auto"} />
    </span>
  );
}

/** A stamp across a face (e.g. Unverified). Decorative for screen readers: the state badge on the front already says it. */
function Watermark({ text, face }: { text: string; face: "front" | "back" }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span
        className={[
          "-rotate-12 whitespace-nowrap rounded-[var(--radius-field)] border-4 border-current px-5 py-1 text-4xl font-bold",
          face === "front" ? "text-danger/45" : "text-white/45",
        ].join(" ")}
      >
        {text}
      </span>
    </span>
  );
}

/**
 * The row layout (size="row"), for search results (rules S14, C1, C2, R9). Photo at the reading start, then name, specialty,
 * languages, visit types, the verification state, then next available and the all-in price beside the action, in the same
 * order on every row; an unknown value says so rather than leaving a gap. The whole row opens the profile through a stretched
 * link on the name, and the action is a sibling link in its own panel, so nothing interactive is nested.
 */
function DoctorRow({
  doctor,
  state,
  name,
  altName,
  specialty,
  city,
  stateBadge,
  href,
  action,
  priceNote,
  canBook,
}: {
  doctor: DoctorCardData;
  state: DoctorCardState;
  name: string;
  altName: string;
  specialty: string;
  city: string;
  stateBadge: React.ReactNode;
  href?: string;
  action?: { href: string; label: string };
  priceNote?: string;
  canBook: boolean;
}) {
  const t = useTranslations("card");
  const locale = useLocale() as Locale;
  const bookable = canBook && state === "verified" && Boolean(doctor.nextAvailableLabel);

  return (
    <article
      className={[
        "relative isolate flex flex-col gap-3 rounded-[var(--radius-card)] border border-b-4 border-sand-200 bg-white p-4 shadow-[var(--shadow-nav)] transition-shadow focus-within:ring-2 focus-within:ring-lagoon-500 hover:shadow-[var(--shadow-card)] sm:flex-row sm:gap-5 sm:p-5",
        // The lagoon edge of the card front marks verified doctors only; unclaimed and pending rows never look the same (rule U1).
        state === "verified" ? "border-b-lagoon-600" : "border-b-sand-400",
      ].join(" ")}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3 sm:gap-4">
          {doctor.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doctor.photoUrl} alt="" className="size-14 shrink-0 rounded-2xl bg-sand-100 object-cover sm:size-24" />
          ) : (
            <div aria-hidden="true" className="size-14 shrink-0 rounded-2xl bg-sand-100 sm:size-24" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold leading-snug text-ink-900 sm:text-xl">
              {href ? (
                <Link
                  href={href}
                  className="outline-none after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-[''] hover:text-sea-700"
                >
                  {name}
                </Link>
              ) : (
                name
              )}
            </h3>
            <p className="ltr-run hidden text-sm text-ink-500 sm:inline-block" dir="auto">
              {altName}
            </p>
            <p className="text-[15px] leading-snug">
              <span className="font-semibold text-sea-800">{specialty}</span>
              <span className="text-ink-700"> · {city}</span>
            </p>
            <dl className="mt-1 text-sm leading-snug text-ink-700">
              <dt className="sr-only">{t("languages")}</dt>
              <dd>{doctor.languages}</dd>
              <dt className="sr-only">{t("visitTypes")}</dt>
              <dd className="mt-0.5">{[...doctor.visitTypes.map((v) => t(v)), t(doctor.ages)].join(" · ")}</dd>
            </dl>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:ps-28">
          {stateBadge}
          {doctor.boardCertified && state === "verified" ? (
            <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-gold-700" title={t("boardCertifiedHint")}>
              <CheckIcon /> {t("boardCertified")}
            </span>
          ) : null}
          {doctor.yearsInPractice ? (
            <span className="text-[12.5px] font-semibold text-ink-700">{t("yearsInPractice", { years: doctor.yearsInPractice, yearsLabel: formatNumber(doctor.yearsInPractice, locale) })}</span>
          ) : null}
        </div>
      </div>

      {/* The lagoon panel echoes the card back: next available (the hook), the all-in price and the action. */}
      <div
        className={[
          "flex items-center gap-3 rounded-[var(--radius-field)] p-3 sm:w-60 sm:shrink-0 sm:flex-col sm:items-stretch sm:justify-between",
          bookable ? "bg-lagoon-100 text-lagoon-900" : "bg-sand-100 text-ink-700",
        ].join(" ")}
      >
        {state === "verified" ? (
          <div className="min-w-0 flex-1 sm:flex-none">
            <p className="text-sm leading-snug">
              <span className="text-xs font-semibold">{t("nextAvailable")}: </span>
              <span className="tabular font-bold">{doctor.nextAvailableLabel ?? t("noAvailability")}</span>
            </p>
            <p className="mt-1.5 text-xs text-ink-700">
              {t("fee")}
              {priceNote ? <> · {priceNote}</> : null}
            </p>
            <p className="tabular text-xl font-bold leading-tight text-ink-900">{doctor.feeLabel ?? t("noAvailability")}</p>
          </div>
        ) : (
          <p className="min-w-0 flex-1 text-sm sm:flex-none">{state === "unclaimed" ? t("unclaimedHint") : t("noAvailability")}</p>
        )}
        {action ? (
          <LinkButton href={action.href} variant={bookable ? "primary" : "secondary"} className="relative z-10 shrink-0">
            {action.label}
          </LinkButton>
        ) : null}
      </div>
    </article>
  );
}
