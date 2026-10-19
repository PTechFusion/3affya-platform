// Screen 6, unclaimed profile (and pending, which renders the same with the pending badge). Layout call: grey Unclaimed banner
// with source and date, placeholder photo, name, specialty, city, the facts table, the teal claim panel holding the pre-made
// card (the hook), then verified doctors in the same specialty so the patient is not stranded, then the invite.
// Rules U1 U2 C3 (label, facts only, neutral placeholder), U4 U5 (claim free, what can be edited, this is not me), U3 S6
// (no Book; a bookable alternative). Task 2.2: this page renders from RegistryFacts and toRegistryCardData only, so no fee,
// availability, checkout or contact field reaches the response.
// States: default; ?state=removalPending (a removal request is waiting); ?state=invited (the patient's invite was sent).
import { getTranslations } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { DoctorCard } from "@/components/brand/DoctorCard";
import { CheckIcon, ChevronNext, EmptyState, LinkButton, Surface } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { business } from "@/config/business";
import { formatDate, formatNumber, type Locale } from "@/lib/format";
import { toDoctorCardData, toRegistryCardData, toRegistryFacts, verifiedAlternatives, withoutBooking, type SampleDoctorDetails } from "@/lib/sample";
import { emergencyNumberFor, type Viewer } from "@/lib/viewer";
import { Breadcrumbs, sectionTitle } from "./bits";
import { InviteDoctor } from "./InviteDoctor";

type Props = { doctor: SampleDoctorDetails; locale: Locale; viewer: Viewer; removalPending: boolean; invited: boolean };

const CAN_ADD = ["photo", "fee", "times", "bio", "tags"] as const;

export async function RegistryProfile({ doctor: d, locale: loc, viewer, removalPending, invited }: Props) {
  const t = await getTranslations("profile");
  const tc = await getTranslations("common");
  const tl = await getTranslations("languages");
  const tn = await getTranslations("nav");

  const f = toRegistryFacts(d);
  const card = toRegistryCardData(d, loc, viewer.timeZone, tl);
  const ar = loc === "ar";
  const name = ar ? f.nameAr : f.nameEn;
  const altName = ar ? f.nameEn : f.nameAr;
  const specialty = ar ? f.specialtyAr : f.specialtyEn;
  const city = ar ? f.cityAr : f.cityEn;
  const gender = f.gender;
  const pending = f.state === "pending";
  const asOf = f.asOf ? formatDate(new Date(`${f.asOf}T00:00:00Z`), "UTC", loc) : undefined;
  const source = t(`registry.source.${f.source}`);
  // The date never splits across lines (the day from its month).
  const sourceLine = asOf
    ? t.rich("registry.sourceLine", { source, date: asOf, nowrap: (chunks) => <span className="whitespace-nowrap">{chunks}</span> })
    : undefined;
  const hours = business.removalSlaHours;
  const thisIsMe = `/doctors/${f.id}/this-is-me`;
  const specialtyHref = `/search?specialty=${f.specialty}`;
  const alt = verifiedAlternatives(d);

  const facts: Array<[string, string | null]> = [
    [t("registry.school"), f.medicalSchool],
    [t("registry.year"), f.graduationYear ? formatNumber(f.graduationYear, loc, { useGrouping: false }) : null],
    [t("registry.group"), f.groupPractice],
    [t("registry.hospital"), f.hospitalAffiliation],
  ];

  const panel = pending
    ? { title: t("registry.pendingClaim.title"), body: t("registry.pendingClaim.body"), cta: t("registry.pendingClaim.cta"), href: "/professional/builder", notMe: true }
    : removalPending
      ? { title: t("registry.removal.claimTitle", { gender }), body: t("registry.removal.claimBody", { gender }), cta: tc("claimProfile"), href: thisIsMe, notMe: false }
      : { title: t("registry.claim.title", { gender }), body: t("registry.claim.body"), cta: tc("claimProfile"), href: thisIsMe, notMe: true };

  return (
    <>
      <SiteNav />
      {/* Rule U1: the grey label, source and date come first so the page never reads as a verified profile. */}
      <div className="border-b border-sand-300 bg-sand-200">
        <div className="mx-auto max-w-6xl px-4 py-3 text-sm text-ink-700 sm:px-6">
          <p>
            <span className="font-semibold text-ink-900">{pending ? t("registry.pendingLabel") : t("registry.unclaimedLabel")}</span>{" "}
            {pending ? t("registry.pendingBody", { gender }) : t("registry.unclaimedBody", { gender })}
          </p>
          {!pending && sourceLine ? <p className="mt-0.5 text-ink-500">{sourceLine}</p> : null}
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-14 pt-5 sm:px-6 sm:pt-6">
        <Breadcrumbs label={t("breadcrumb")} doctors={tn("doctors")} specialty={specialty} specialtyHref={specialtyHref} current={name} />
        {removalPending && !pending ? (
          <div role="status" className="mb-6 rounded-[var(--radius-card)] border border-sky-500/40 bg-sky-100 p-4">
            <p className="font-semibold text-sea-900">{t("registry.removal.title")}</p>
            <p className="mt-1 text-sm text-ink-700">{t("registry.removal.body", { hours, hoursLabel: formatNumber(hours, loc) })}</p>
          </div>
        ) : null}

        {/* Phone: one column in DOM order 1-5 (the wrappers are display: contents). Desktop: two columns, the wrappers are blocks. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-12">
          <div className="contents lg:col-start-2 lg:row-start-1 lg:block">
            <section aria-labelledby="claim-title" className="order-3 rounded-[var(--radius-card)] bg-lagoon-900 p-5 text-white sm:p-6">
              <p className="font-semibold text-lagoon-300">{t("registry.claim.eyebrow", { name, gender })}</p>
              <h2 id="claim-title" className="mt-1 text-2xl font-bold">
                {panel.title}
              </h2>
              {/* The CTA sits right under the title so it stays in the first phone screen; the explanation captions the card. */}
              <div className="mt-4 flex flex-col gap-3">
                <LinkButton href={panel.href} variant="secondary" size="lg" className="w-full">
                  {panel.cta}
                </LinkButton>
                {panel.notMe ? (
                  <Link href={`${thisIsMe}?choice=remove`} className="self-center text-center text-sm font-semibold text-white underline underline-offset-4 hover:text-lagoon-300">
                    {t("registry.claim.notMe")}
                  </Link>
                ) : null}
              </div>
              {/* The hook: the card is already made from the registry; claiming unlocks the rest (rule U5). */}
              <figure className="mt-6">
                <figcaption className="mb-4 text-white/85">{panel.body}</figcaption>
                <DoctorCard doctor={card} state={f.state} side="front" />
              </figure>
              {!pending ? (
                <>
                  <p className="mt-5 text-sm font-semibold">{t("registry.claim.canAdd")}</p>
                  <ul className="mt-2 grid gap-1.5 text-sm text-white/90">
                    {CAN_ADD.map((k) => (
                      <li key={k} className="flex items-center gap-2">
                        <CheckIcon className="size-4 shrink-0 text-lagoon-300" />
                        {t(`registry.claim.items.${k}`)}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          </div>

          <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:gap-8">
            <header className="order-1 flex items-start gap-4">
              {f.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.photoUrl} alt="" className="size-20 shrink-0 rounded-2xl object-cover ring-4 ring-white sm:size-24" />
              ) : (
                // Rule C3: a neutral placeholder for a registry profile, never a scraped photo and never a broken image.
                <div aria-hidden="true" className="size-20 shrink-0 rounded-2xl bg-sand-200 ring-4 ring-white sm:size-24" />
              )}
              <div className="min-w-0">
                <h1 className="text-2xl font-bold leading-tight text-sea-900 sm:text-3xl">{name}</h1>
                <p className="text-sm text-ink-700">
                  <bdi>{altName}</bdi>
                </p>
                <p className="mt-1 font-semibold text-sea-800">{specialty}</p>
                <p className="text-sm text-ink-700">{city}</p>
              </div>
            </header>

            <section aria-labelledby="facts-title" className="order-2">
              <Surface>
                <h2 id="facts-title" className={sectionTitle}>
                  {t("registry.factsTitle")}
                </h2>
                {/* Rule U2: facts only, each from the registry; no score, no stars. Missing values say so (rule C1).
                    Two by two so the claim panel still starts in the first phone screen. */}
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  {facts.map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-xs font-semibold text-ink-500">{label}</dt>
                      <dd className="mt-0.5 text-[15px] leading-snug text-ink-900">
                        {value ? <bdi>{value}</bdi> : <span className="text-ink-500">{t("registry.notListed")}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 border-t border-sand-200 pt-3 text-xs text-ink-500">
                  {pending && sourceLine ? <span className="block">{sourceLine}</span> : null}
                  {t("registry.factsNote")}
                </p>
              </Surface>
            </section>

            <section aria-labelledby="alternatives-title" className="order-4">
              <h2 id="alternatives-title" className={sectionTitle}>
                {t("registry.alternatives.title", { specialty })}
              </h2>
              <p className="mt-1 text-ink-700">
                {alt.scope === "specialty"
                  ? t("registry.alternatives.lead")
                  : t(`registry.alternatives.relaxed.${alt.scope === "ages" ? d.ages : "any"}`, { specialty })}
              </p>
              {alt.doctors.length ? (
                <>
                  <ul className="mt-4 grid gap-5 sm:grid-cols-2">
                    {alt.doctors.map((v) => (
                      <li key={v.id} className="flex flex-col gap-2">
                        {/* Front only and without price or times: this page carries no booking data, not even another doctor's. */}
                        <DoctorCard doctor={withoutBooking(toDoctorCardData(v, loc, viewer.timeZone, tl))} state="verified" size="mini" side="front" />
                        <Link
                          href={`/doctors/${v.id}`}
                          aria-label={t("registry.alternatives.viewProfileOf", { name: ar ? v.nameAr : v.nameEn })}
                          className="inline-flex min-h-10 items-center gap-1 self-start font-semibold text-sea-700 hover:underline"
                        >
                          {tc("viewProfile")} <ChevronNext />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <LinkButton href={alt.scope === "specialty" ? specialtyHref : "/search"} variant="secondary" className="mt-4">
                    {alt.scope === "specialty" ? t("registry.alternatives.seeAll", { specialty }) : t("registry.alternatives.searchAll")} <ChevronNext />
                  </LinkButton>
                </>
              ) : (
                <div className="mt-4">
                  <EmptyState
                    title={t("registry.alternatives.title", { specialty })}
                    body={t("registry.alternatives.relaxed.any", { specialty })}
                    action={<LinkButton href="/search">{t("registry.alternatives.searchAll")}</LinkButton>}
                  />
                </div>
              )}
            </section>

            {!pending && !removalPending ? (
              <section aria-labelledby="invite-title" className="order-5">
                <Surface>
                  <h2 id="invite-title" className="text-lg font-bold text-sea-900">
                    {t("registry.invite.title", { name, gender })}
                  </h2>
                  <p className="mt-1 text-ink-700">{t("registry.invite.body", { gender })}</p>
                  <div className="mt-4">
                    <InviteDoctor doctorId={f.id} name={name} gender={gender} initial={invited ? { ok: true } : null} />
                  </div>
                </Surface>
              </section>
            ) : null}
          </div>
        </div>
      </main>
      <SiteFooter emergencyNumber={emergencyNumberFor(viewer.country)} />
    </>
  );
}
