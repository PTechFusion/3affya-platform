"use client";
// The one DoctorCard. Renders the builder preview, search rows, the profile header and the ID card image.
// Front: beach sand, name and identity. Back: lagoon, the details. Same card for every doctor (Dr Ayman, 17 Oct).
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, Button, CheckIcon } from "@/components/ui";

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
  size?: "full" | "mini";
  /** Force a side (used by the ID card renderer and the brand page). */
  side?: "front" | "back";
  onBook?: () => void;
};

export function DoctorCard({ doctor, state, size = "full", side, onBook }: Props) {
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

  const stateBadge =
    state === "verified" ? (
      <Badge tone="verified">{doctor.verifiedOnLabel ? t("verifiedOn", { date: doctor.verifiedOnLabel }) : t("verified")}</Badge>
    ) : state === "pending" ? (
      <Badge tone="pending">{t("pending")}</Badge>
    ) : (
      <Badge tone="unclaimed">{t("unclaimed")}</Badge>
    );

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
      className={[
        "flex h-full flex-col rounded-[var(--radius-card)] border-b-[10px] border-lagoon-600 text-ink-900 shadow-[var(--shadow-card)]",
        mini ? "p-3" : "p-5 sm:p-6",
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
      </div>
    </div>
  );

  const Back = (
    <div
      className={["flex h-full flex-col rounded-[var(--radius-card)] text-white shadow-[var(--shadow-card)]", mini ? "p-3" : "p-5 sm:p-6"].join(" ")}
      style={{ background: "linear-gradient(135deg, #065E78, #08708E 45%, #0194BE 80%, #02B3CA)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={[mini ? "text-base" : "text-lg", "font-bold"].join(" ")}>{name}</p>
        {flipControl}
      </div>
      <dl className={["mt-1.5 grid gap-x-4 gap-y-1", mini ? "text-xs" : "text-[13px]", "grid-cols-[auto_1fr]"].join(" ")}>
        <dt className="text-white/75">{t("languages")}</dt>
        <dd>{doctor.languages}</dd>
        <dt className="text-white/75">{t("visitTypes")}</dt>
        <dd>{doctor.visitTypes.map((v) => t(v)).join(" · ")}</dd>
        <dt className="text-white/75">{t("ages")}</dt>
        <dd>{t(doctor.ages)}</dd>
        {state !== "unclaimed" && doctor.trainingLines.length ? (
          <>
            <dt className="text-white/75">{t("training")}</dt>
            <dd>{doctor.trainingLines.join(" · ")}</dd>
          </>
        ) : null}
        {doctor.yearsInPractice ? (
          <>
            <dt className="text-white/75" />
            <dd className="font-semibold">{t("yearsInPractice", { years: doctor.yearsInPractice })}</dd>
          </>
        ) : null}
      </dl>
      {doctor.tags.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
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
          {state === "verified" ? (
            <p className="text-xs text-white/85">
              {t("nextAvailable")}: <span className="tabular">{doctor.nextAvailableLabel ?? t("noAvailability")}</span>
            </p>
          ) : null}
        </div>
        {state === "verified" && !mini ? (
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
      </div>
    </div>
  );

  return (
    <div className={["relative w-full", mini ? "max-w-xs" : "max-w-md"].join(" ")} style={{ perspective: "1400px" }}>
      <div
        onClick={() => !side && setFlipped((f) => !f)}
        className="w-full text-start"
        style={{ transformStyle: "preserve-3d", transition: "transform .55s cubic-bezier(.2,.8,.2,1)", transform: showBack ? "rotateY(180deg)" : "none" }}
      >
        <div className={mini ? "h-40" : "h-[356px]"} style={{ backfaceVisibility: "hidden" }}>
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
