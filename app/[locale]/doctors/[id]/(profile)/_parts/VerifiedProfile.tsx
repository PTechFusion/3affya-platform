// Screen 7, verified profile. Block order per rule C9: card, credentials and training, fees and visit types, availability, bio.
// Phone: the card as the header (tap to flip, the hook), the trust line with the board-certified definition (C7, H8), the
// booking box with the all-in price (C5) and the next three times (C6), then the blocks, with a sticky Book bar (C10).
// Desktop: content on the reading-start side; the card and the pinned booking box on the other side (mirrors in RTL).
// States: default; no published times (doc_001, doc_007); payouts not ready (?state=payoutsNotReady): Book is hidden.
import { getTranslations } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { DoctorCard } from "@/components/brand/DoctorCard";
import { Badge, ChevronNext, EmptyState, LinkButton, SlotLink, Surface, Tag } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { business } from "@/config/business";
import { verifiers } from "@/config/verifiers";
import { feeLines } from "@/lib/fees";
import { formatDate, formatMoney, formatNumber, formatSlotDay, formatTime, formatZone, type Locale } from "@/lib/format";
import { profileFor, toDoctorCardData, upcomingSlots, type SampleDoctorDetails } from "@/lib/sample";
import { emergencyNumberFor, type Viewer } from "@/lib/viewer";
import { Breadcrumbs, Row, VerifierLink, sectionTitle } from "./bits";

type Props = { doctor: SampleDoctorDetails; locale: Locale; viewer: Viewer; payoutsReady: boolean };

/** The layout call: the booking box shows the next three times; the availability block previews the next three days. */
const BOX_SLOTS = 3;
const PREVIEW_DAYS = 3;

export async function VerifiedProfile({ doctor: d, locale: loc, viewer, payoutsReady }: Props) {
  const t = await getTranslations("profile");
  const tc = await getTranslations("common");
  const tcard = await getTranslations("card");
  const tl = await getTranslations("languages");
  const tn = await getTranslations("nav");

  const p = profileFor(d.id);
  const tz = viewer.timeZone;
  const ar = loc === "ar";
  const name = ar ? d.nameAr : d.nameEn;
  const altName = ar ? d.nameEn : d.nameAr;
  const specialty = ar ? d.specialtyAr : d.specialtyEn;
  const city = ar ? d.cityAr : d.cityEn;
  const licenceState = ar ? p?.licenceStateAr : p?.licenceStateEn;
  const gender = d.gender;

  const slots = upcomingSlots(d.id);
  const canBook = payoutsReady && slots.length > 0;
  const bookHref = `/book/${d.id}`;
  const slotHref = (s: Date) => `${bookHref}?slot=${encodeURIComponent(s.toISOString())}`;
  const otherDoctorsHref = `/search?specialty=${d.specialty}`;

  const baseCard = toDoctorCardData(d, loc, tz, tl);
  // When Book is hidden the card back must not advertise a next time either.
  const card = canBook ? baseCard : { ...baseCard, nextAvailableLabel: undefined };
  // Rule C5: the only price on the profile is the all-in total; the three lines live on /fees and at checkout.
  const price = d.feeUsdCents != null ? formatMoney(feeLines(d.feeUsdCents).totalCents, business.currencyPresentment, loc) : undefined;
  const zone = formatZone(slots[0] ?? new Date(), tz);
  const slotLabel = (s: Date) => t("booking.slotLabel", { day: formatSlotDay(s, tz, loc), time: formatTime(s, tz, loc), zone });
  const years = d.yearsInPractice;
  const yearsLine = years ? t("yearsInPractice", { years, yearsLabel: formatNumber(years, loc) }) : undefined;
  const hours = business.fullRefundCutoffHours;
  const months = business.verifiedReverifyMonths;
  const verifiedOn = baseCard.verifiedOnLabel; // the same label the card front shows (rule C8: dated badge)
  const days = groupByDay(slots, tz, loc).slice(0, PREVIEW_DAYS);
  const bio = pickBio(d, loc);
  const link = "font-semibold text-sea-700 underline-offset-2 hover:underline";

  const bookingBox = (
    <section aria-labelledby="booking-title">
      <Surface>
        <h2 id="booking-title" className="sr-only">
          {t("booking.title")}
        </h2>
        <p className="text-sm text-ink-500">{t("booking.priceLabel")}</p>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="tabular text-3xl font-bold text-sea-900">{price ?? t("booking.priceUnknown")}</p>
          {canBook ? <Badge tone="success">{t("booking.accepting", { gender })}</Badge> : null}
        </div>
        {canBook ? (
          <>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3">
              <h3 className="font-semibold text-ink-900">{tcard("nextAvailable")}</h3>
              <span className="ltr-run text-xs text-ink-500">{zone}</span>
            </div>
            <ul className="mt-2 grid grid-cols-3 gap-2">
              {slots.slice(0, BOX_SLOTS).map((s) => (
                <li key={s.toISOString()}>
                  <SlotLink href={slotHref(s)} day={formatSlotDay(s, tz, loc)} time={formatTime(s, tz, loc)} label={slotLabel(s)} />
                </li>
              ))}
            </ul>
            <LinkButton href={bookHref} size="lg" className="mt-4 w-full">
              {tc("bookFirstVisit")}
            </LinkButton>
            <p className="mt-3 text-sm text-ink-700">
              {t("booking.cancellation", { hours, hoursLabel: formatNumber(hours, loc) })}{" "}
              <Link href="/refunds" className={link}>
                {t("booking.refundsLink")}
              </Link>
            </p>
          </>
        ) : (
          <div className="mt-4 rounded-[var(--radius-field)] bg-sand-100 p-4">
            <p className="font-semibold text-ink-900">{payoutsReady ? tcard("noAvailability") : t("booking.notOpenTitle")}</p>
            <p className="mt-1 text-sm text-ink-700">
              {payoutsReady ? t("booking.noTimesBody", { name, gender }) : t("booking.notOpenBody", { name, gender })}
            </p>
            <LinkButton href={otherDoctorsHref} variant="secondary" className="mt-3 w-full">
              {t("booking.otherDoctors", { specialty })}
            </LinkButton>
          </div>
        )}
        <p className="mt-3 text-sm text-ink-700">
          {t("booking.includes")}{" "}
          <Link href="/fees" className={link}>
            {t("booking.feesLink")}
          </Link>
        </p>
      </Surface>
    </section>
  );

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-14 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs label={t("breadcrumb")} doctors={tn("doctors")} specialty={specialty} specialtyHref={otherDoctorsHref} current={name} />
        {/* Phone: one column in DOM order 1-4 (the wrappers are display: contents). Desktop: two columns, the wrappers are blocks. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-12">
          <div className="contents lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-6">
            <div className="order-1">
              <DoctorCard doctor={card} state="verified" bookHref={canBook ? bookHref : undefined} bookable={canBook} />
            </div>
            <div className="order-3 lg:sticky lg:top-28">{bookingBox}</div>
          </div>

          <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:gap-6">
            <header className="order-2">
              <h1 className="sr-only lg:not-sr-only lg:text-4xl lg:font-bold lg:leading-tight lg:text-sea-900">{name}</h1>
              <p className="hidden text-ink-700 lg:block">
                <bdi>{altName}</bdi>
              </p>
              <p className="hidden text-lg font-semibold text-sea-800 lg:mt-1 lg:block">
                {specialty} · {city}
              </p>
              {/* No reviews at launch: years in practice carry the trust, with New to 3affya instead of empty stars (rule C7). */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 lg:mt-4">
                <Badge tone="info">{tcard("newToPlatform")}</Badge>
                {yearsLine ? <span className="text-sm font-semibold text-ink-900">{yearsLine}</span> : null}
              </div>
            </header>

            <div className="order-4 flex flex-col gap-6">
              {/* Rule H8: board certified defined in one sentence on first use in text, ahead of the credentials that name the
                  board. On phone it follows the booking box so the card, price and times keep the first screen (rule C10). */}
              {d.boardCertified ? (
                <p className="text-sm text-ink-700 lg:-mt-3">
                  <span className="font-semibold text-ink-900">{tcard("boardCertified")}:</span> {tcard("boardCertifiedHint")}
                </p>
              ) : null}
              <section aria-labelledby="credentials-title">
                <Surface>
                  <h2 id="credentials-title" className={sectionTitle}>
                    {t("credentials.title")}
                  </h2>
                  {verifiedOn ? (
                    <div className="mt-3">
                      <Badge tone="verified">{t("credentials.verifiedOn", { date: verifiedOn })}</Badge>
                      <p className="mt-2 text-sm text-ink-700">
                        {t("credentials.verifiedBody", { months, monthsLabel: formatNumber(months, loc) })}
                      </p>
                    </div>
                  ) : null}
                  <dl className="mt-4 divide-y divide-sand-200 border-t border-sand-200">
                    {d.boardCertified && p?.board ? (
                      <Row stack label={t("credentials.board")}>
                        <p>
                          <bdi>{p.board}</bdi>
                        </p>
                        <VerifierLink href={verifiers.board.href} domain={verifiers.board.domain} lead={t("credentials.checkOn")} />
                      </Row>
                    ) : null}
                    {licenceState ? (
                      <Row stack label={t("credentials.licence")}>
                        <p>{t("credentials.licenceValue", { state: licenceState })}</p>
                        <VerifierLink href={verifiers.licence.href} domain={verifiers.licence.domain} lead={t("credentials.checkOn")} />
                      </Row>
                    ) : null}
                    {d.training.length ? (
                      <Row stack label={t("credentials.training")}>
                        <ul className="space-y-1">
                          {d.training.map((line) => (
                            <li key={line}>
                              <bdi>{line}</bdi>
                            </li>
                          ))}
                        </ul>
                      </Row>
                    ) : null}
                    {d.medicalSchool ? (
                      <Row stack label={t("credentials.school")}>
                        <p>
                          <bdi>{d.medicalSchool}</bdi>
                        </p>
                        {d.graduationYear ? (
                          <p className="text-sm text-ink-500">
                            {t("credentials.graduated", { year: formatNumber(d.graduationYear, loc, { useGrouping: false }) })}
                          </p>
                        ) : null}
                      </Row>
                    ) : null}
                    <Row stack label={t("credentials.experience")}>
                      {yearsLine ? <p>{yearsLine}</p> : null}
                      <p className="text-sm text-ink-500">{t("noReviews")}</p>
                    </Row>
                  </dl>
                </Surface>
              </section>

              <section aria-labelledby="visits-title">
                <Surface>
                  <h2 id="visits-title" className={sectionTitle}>
                    {t("visits.title")}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-sm text-ink-500">{t("booking.priceLabel")}</span>
                    <span className="tabular text-xl font-bold text-sea-900">{price ?? t("booking.priceUnknown")}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-700">
                    {d.visitTypes.length > 1 ? `${t("visits.samePrice")} ` : ""}
                    {t("booking.includes")}{" "}
                    <Link href="/fees" className={link}>
                      {t("booking.feesLink")}
                    </Link>
                  </p>
                  {/* Rule C12: each visit type with its one-line best-for hint; the patient picks in the slot picker. */}
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {d.visitTypes.map((v) => (
                      <li key={v} className="rounded-[var(--radius-field)] border border-sand-200 bg-sand-50 p-4">
                        <p className="font-semibold text-ink-900">{tcard(v)}</p>
                        <p className="mt-1 text-sm text-ink-700">{t(`visits.bestFor.${v}`)}</p>
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-4 divide-y divide-sand-200 border-t border-sand-200">
                    <Row label={tcard("languages")}>{card.languages}</Row>
                    <Row label={tcard("ages")}>{tcard(d.ages)}</Row>
                    {d.tags.length ? (
                      <Row label={tcard("expertise")}>
                        <ul className="flex flex-wrap gap-1.5">
                          {d.tags.map((tag) => (
                            <li key={tag}>
                              <Tag>
                                <bdi>{tag}</bdi>
                              </Tag>
                            </li>
                          ))}
                        </ul>
                      </Row>
                    ) : null}
                  </dl>
                </Surface>
              </section>

              <section aria-labelledby="availability-title">
                <Surface>
                  <h2 id="availability-title" className={sectionTitle}>
                    {t("availability.title")}
                  </h2>
                  {canBook ? (
                    <>
                      <p className="mt-1 text-sm text-ink-700">
                        {t("availability.lead")} <span className="ltr-run">{zone}</span>
                      </p>
                      <div className="mt-4 space-y-4">
                        {days.map((day) => (
                          <div key={day.key}>
                            <h3 className="text-sm font-semibold text-ink-900">{day.label}</h3>
                            <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                              {day.slots.map((s) => (
                                <li key={s.toISOString()}>
                                  <SlotLink href={slotHref(s)} time={formatTime(s, tz, loc)} label={slotLabel(s)} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      <LinkButton href={bookHref} variant="secondary" className="mt-5">
                        {t("availability.seeAll")} <ChevronNext />
                      </LinkButton>
                    </>
                  ) : (
                    <div className="mt-4">
                      <EmptyState
                        title={payoutsReady ? tcard("noAvailability") : t("booking.notOpenTitle")}
                        body={payoutsReady ? t("availability.emptyBody", { name, gender }) : t("availability.notOpenBody")}
                        action={<LinkButton href={otherDoctorsHref}>{t("booking.otherDoctors", { specialty })}</LinkButton>}
                      />
                    </div>
                  )}
                </Surface>
              </section>

              {bio ? (
                <section aria-labelledby="about-title">
                  <Surface>
                    <h2 id="about-title" className={sectionTitle}>
                      {t("about.title", { name })}
                    </h2>
                    {/* Rule R4: a bio aligns by its own language, so an English bio stays left-aligned on the Arabic page. */}
                    <p lang={bio.lang} dir={bio.lang === "ar" ? "rtl" : "ltr"} className="mt-2 text-start text-ink-700">
                      {bio.text}
                    </p>
                  </Surface>
                </section>
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter emergencyNumber={emergencyNumberFor(viewer.country)} />
      {canBook ? (
        <>
          {/* Rule C10: Book stays in reach on phone. Desktop has the pinned box instead. */}
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-sand-300 bg-white/95 backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs text-ink-500">{t("booking.priceLabel")}</p>
                <p className="tabular text-lg font-bold leading-tight text-sea-900">{price}</p>
              </div>
              <LinkButton href={bookHref} className="shrink-0">
                {tc("bookFirstVisit")}
              </LinkButton>
            </div>
          </div>
          <div aria-hidden="true" className="h-20 lg:hidden" />
        </>
      ) : null}
    </>
  );
}

/** Slots grouped by calendar day in the viewer's zone, recomputed every render (rule P6; times are stored in UTC). */
function groupByDay(slots: Date[], timeZone: string, locale: Locale): Array<{ key: string; label: string; slots: Date[] }> {
  const days = new Map<string, { key: string; label: string; slots: Date[] }>();
  for (const s of slots) {
    const key = formatDate(s, timeZone, "en");
    const day = days.get(key) ?? { key, label: formatSlotDay(s, timeZone, locale), slots: [] };
    day.slots.push(s);
    days.set(key, day);
  }
  return [...days.values()];
}

/** The bio in the page language when the doctor wrote one, otherwise the other language with its own direction (rule R4). */
function pickBio(d: SampleDoctorDetails, locale: Locale): { text: string; lang: Locale } | undefined {
  const own = locale === "ar" ? d.bioAr : d.bioEn;
  if (own) return { text: own, lang: locale };
  const other = locale === "ar" ? d.bioEn : d.bioAr;
  return other ? { text: other, lang: locale === "ar" ? "en" : "ar" } : undefined;
}
