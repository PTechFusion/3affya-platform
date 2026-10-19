import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SiteNav } from "@/components/brand/SiteNav";
import { WaterHero } from "@/components/brand/WaterHero";
import { DoctorCard, type DoctorCardData } from "@/components/brand/DoctorCard";
import { Badge, Button, ChevronNext, CoachMark, EmptyState, Field, Input, Select, Skeleton, Surface, Tag } from "@/components/ui";
import { formatMoney, formatTimeInZone, formatDate } from "@/lib/format";

const COLOURS: Array<[string, string[]]> = [
  ["Deep sea", ["sea-900", "sea-800", "sea-700", "sea-500", "sea-100"]],
  ["Lagoon", ["lagoon-900", "lagoon-800", "lagoon-600", "lagoon-500", "lagoon-300", "lagoon-100"]],
  ["Gold (meaning only)", ["gold-700", "gold-500", "gold-300", "gold-100"]],
  ["Beach sand", ["sand-50", "sand-100", "sand-200", "sand-300", "sand-400"]],
  ["Ink", ["ink-900", "ink-700", "ink-500", "night"]],
  ["Sky and status", ["sky-500", "sky-100", "success", "warning", "danger"]],
];

const HEX: Record<string, string> = {
  "sea-900": "#062F52", "sea-800": "#08467A", "sea-700": "#0B5A9C", "sea-500": "#2A7FC0", "sea-100": "#DCEBF7",
  "lagoon-900": "#065E78", "lagoon-800": "#08708E", "lagoon-600": "#0194BE", "lagoon-500": "#02B3CA", "lagoon-300": "#7EE3F2", "lagoon-100": "#DDF6FA",
  "gold-700": "#82590A", "gold-500": "#C8901E", "gold-300": "#F0CE6A", "gold-100": "#F8EBC4",
  "sand-50": "#F8F6F1", "sand-100": "#EFEBE2", "sand-200": "#E2DCCE", "sand-300": "#DBD3BF", "sand-400": "#C6BEAC",
  "ink-900": "#14202E", "ink-700": "#34404E", "ink-500": "#5E6A77", night: "#0A1622",
  "sky-500": "#48A8D8", "sky-100": "#E3F2FA", success: "#1F8A5B", warning: "#B7791F", danger: "#C4423A",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-sand-200 py-10">
      <h2 className="mb-5 text-2xl font-bold text-sea-900">{title}</h2>
      {children}
    </section>
  );
}

export default async function BrandPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("brand");
  const ts = await getTranslations("sample");
  const tc = await getTranslations("common");
  const loc = locale as "ar" | "en";
  const when = new Date("2026-11-14T15:00:00Z");

  const sample: DoctorCardData = {
    nameEn: "Dr Sara Haddad",
    nameAr: "د. سارة حداد",
    specialtyEn: "Neurology",
    specialtyAr: "طب الأعصاب",
    cityEn: "Houston, Texas",
    cityAr: "هيوستن، تكساس",
    photoUrl: "/brand/placeholder-doctor.svg",
    languages: ts("dialect"),
    visitTypes: ["video", "phone"],
    ages: "adults",
    tags: ts.raw("tags") as string[],
    trainingLines: [ts("school"), ts("residency")],
    yearsInPractice: 14,
    feeLabel: formatMoney(18000, "USD", loc),
    nextAvailableLabel: formatTimeInZone(when, "Asia/Riyadh", loc),
    verifiedOnLabel: formatDate(new Date("2026-10-30T00:00:00Z"), "Asia/Riyadh", loc),
    boardCertified: true,
  };
  const unclaimed: DoctorCardData = { ...sample, photoUrl: undefined, tags: [], trainingLines: [ts("school")], yearsInPractice: undefined, feeLabel: undefined, nextAvailableLabel: undefined, boardCertified: false };

  const sections = ["colours", "type", "spacing", "logo", "hero", "buttons", "fields", "tags", "doctorCard", "coachMark", "table", "dialog", "emptyState", "skeleton", "icons"] as const;

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="py-10">
          <h1 className="text-3xl font-bold text-sea-900 sm:text-4xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-ink-700">{t("intro")}</p>
          <nav className="mt-5 flex flex-wrap gap-2" aria-label="Sections">
            {sections.map((s) => (
              <a key={s} href={`#${s}`} className="rounded-[var(--radius-tag)] bg-sand-100 px-3 py-1.5 text-sm font-medium text-sea-800 hover:bg-sand-200">
                {t(s)}
              </a>
            ))}
          </nav>
        </div>

        <Section id="colours" title={t("colours")}>
          <div className="grid gap-6 sm:grid-cols-2">
            {COLOURS.map(([group, names]) => (
              <div key={group}>
                <h3 className="mb-2 font-semibold">{group}</h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {names.map((n) => (
                    <div key={n} className="overflow-hidden rounded-xl border border-sand-200 bg-white">
                      <div className="h-12" style={{ background: HEX[n] }} />
                      <div className="px-2 py-1.5 text-[11px] leading-tight">
                        <div className="font-semibold">{n}</div>
                        <div className="ltr-run text-ink-500">{HEX[n]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-700">{t("contrast")}</p>
        </Section>

        <Section id="type" title={t("type")}>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-5xl font-bold leading-tight">Aa أب 3affya</p>
              <p className="text-3xl font-bold">{tc("tagline")}</p>
              <p className="text-xl font-semibold">{ts("doctorName")}, {ts("specialty")}</p>
              <p>{t("intro")}</p>
              <p className="text-sm text-ink-500">{loc === "ar" ? t("sizeAr") : t("sizeEn")} · Readex Pro 300 to 700 · letter-spacing 0 · no italics</p>
            </div>
            <div className="space-y-3" lang={loc === "ar" ? "en" : "ar"} dir={loc === "ar" ? "ltr" : "rtl"}>
              <p className="text-5xl font-bold leading-tight">{loc === "ar" ? "Aa 3affya" : "أب عافية"}</p>
              <p className="text-3xl font-bold">{loc === "ar" ? "US-trained, Arabic-speaking doctors. For you." : "أطباء مدرَّبون في أمريكا يتحدثون العربية. من أجلك."}</p>
              <p>{loc === "ar" ? "The other locale, shown side by side so both scales are checked on one screen." : "اللغة الأخرى معروضة جنبا إلى جنب حتى يُفحص المقياسان على شاشة واحدة."}</p>
            </div>
          </div>
        </Section>

        <Section id="spacing" title={t("spacing")}>
          <div className="flex flex-wrap items-end gap-4">
            {[4, 8, 12, 16, 24, 32, 48, 64].map((px) => (
              <div key={px} className="flex flex-col items-center gap-1 text-xs text-ink-500">
                <div className="bg-lagoon-500" style={{ width: px, height: px }} />
                <span className="ltr-run">{px}</span>
              </div>
            ))}
            <div className="ms-6 flex gap-3">
              <div className="size-16 rounded-[var(--radius-card)] bg-sand-300" title="card 22" />
              <div className="size-16 rounded-[var(--radius-field)] bg-sand-300" title="field 12" />
              <div className="h-8 w-16 self-end rounded-[var(--radius-tag)] bg-sand-300" title="tag" />
            </div>
          </div>
        </Section>

        <Section id="logo" title={t("logo")}>
          <p className="mb-4 text-ink-700">{t("logoRule")}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center justify-center rounded-[var(--radius-card)] border border-sand-200 bg-white p-6">
              <Image src="/brand/3affya_logo_en_transparent.png" alt="3affya logo, English tagline" width={1488} height={581} className="h-auto w-full" />
            </div>
            <div className="flex items-center justify-center rounded-[var(--radius-card)] border border-sand-200 bg-sand-50 p-6">
              <Image src="/brand/3affya_logo_ar_transparent.png" alt="3affya logo, Arabic tagline" width={1326} height={510} className="h-auto w-full" />
            </div>
            <div className="flex items-center justify-center rounded-[var(--radius-card)] bg-night p-6">
              <Image src="/brand/3affya_logo_en_on-dark.png" alt="3affya logo on a sand plate for dark backgrounds" width={1742} height={835} className="h-auto w-full" />
            </div>
          </div>
        </Section>

        <Section id="hero" title={t("hero")}>
          <WaterHero className="min-h-[300px] rounded-[var(--radius-card)]">
            <div className="flex flex-col gap-3 px-6 pb-28 pt-10 sm:px-10">
              <p className="text-3xl font-bold text-gold-300 sm:text-5xl">{tc("tagline")}</p>
              <p className="max-w-md text-white/90">{tc("notForEmergencies")}</p>
            </div>
          </WaterHero>
        </Section>

        <Section id="buttons" title={t("buttons")}>
          <div className="flex flex-wrap items-center gap-3">
            <Button>{t("primary")}</Button>
            <Button variant="secondary">{t("secondary")}</Button>
            <Button variant="ghost">{t("ghost")}</Button>
            <Button variant="danger">{t("danger")}</Button>
            <Button disabled>{t("disabled")}</Button>
            <Button size="lg">
              {tc("bookFirstVisit")} <ChevronNext />
            </Button>
          </div>
        </Section>

        <Section id="fields" title={t("fields")}>
          <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
            <Field id="email-ok" label={t("fieldLabel")} hint={t("fieldHint")}>
              <Input id="email-ok" type="email" inputMode="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" placeholder="name@example.com" dir="ltr" />
            </Field>
            <Field id="email-bad" label={t("fieldLabel")} error={t("fieldError")}>
              <Input id="email-bad" type="email" inputMode="email" defaultValue="name@" invalid dir="ltr" aria-describedby="email-bad-error" />
            </Field>
            <Field id="visit" label={t("selectLabel")}>
              <Select id="visit" defaultValue="video">
                <option value="video">Video</option>
                <option value="phone">Phone</option>
              </Select>
            </Field>
            <Field id="otp" label="OTP" hint="inputmode=numeric · autocomplete=one-time-code · paste works">
              <Input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]*" placeholder="123456" dir="ltr" className="ltr-run tracking-[0.3em]" />
            </Field>
          </div>
        </Section>

        <Section id="tags" title={t("tags")}>
          <div className="flex flex-wrap items-center gap-2">
            <Tag>{t("sampleTag")}</Tag>
            <Tag>{ts.raw("tags")[1]}</Tag>
            <Tag>{ts.raw("tags")[2]}</Tag>
            <span className="mx-2 h-6 w-px bg-sand-300" />
            <Badge tone="verified">{tc("brand") === "3affya" ? "Credentials verified" : "تم التحقق من الشهادات"}</Badge>
            <Badge tone="pending">{loc === "ar" ? "قيد التحقق" : "Pending verification"}</Badge>
            <Badge tone="unclaimed">{loc === "ar" ? "غير مُفعَّل" : "Unclaimed"}</Badge>
            <Badge tone="info">{loc === "ar" ? "جديد في عافية" : "New to 3affya"}</Badge>
            <Badge tone="success">{loc === "ar" ? "مؤكد" : "Confirmed"}</Badge>
            <Badge tone="warning">{loc === "ar" ? "متأخر" : "Past due"}</Badge>
            <Badge tone="danger">{loc === "ar" ? "ملغى" : "Cancelled"}</Badge>
          </div>
        </Section>

        <Section id="doctorCard" title={t("doctorCard")}>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-3">
              <h3 className="font-semibold">Unclaimed</h3>
              <DoctorCard doctor={unclaimed} state="unclaimed" />
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold">Pending</h3>
              <DoctorCard doctor={{ ...sample, feeLabel: undefined, nextAvailableLabel: undefined }} state="pending" />
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold">Verified</h3>
              <DoctorCard doctor={sample} state="verified" />
            </div>
          </div>
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="space-y-3">
              <h3 className="font-semibold">Verified, back</h3>
              <DoctorCard doctor={sample} state="verified" side="back" />
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold">Mini (builder, phone)</h3>
              <DoctorCard doctor={sample} state="verified" size="mini" />
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold">Mini, back</h3>
              <DoctorCard doctor={sample} state="verified" size="mini" side="back" />
            </div>
          </div>
        </Section>

        <Section id="coachMark" title={t("coachMark")}>
          <div className="pt-3">
            <CoachMark title={t("coachTitle")} body={t("coachBody")} />
          </div>
        </Section>

        <Section id="table" title={t("table")}>
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-sand-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-sand-100 text-start text-ink-700">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{ts("doctorName")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{ts("specialty")}</th>
                  <th className="px-4 py-3 text-start font-semibold">{loc === "ar" ? "الحالة" : "Status"}</th>
                  <th className="px-4 py-3 text-start font-semibold">{loc === "ar" ? "التاريخ" : "Date"}</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="border-t border-sand-200">
                    <td className="px-4 py-3">{t("sampleRow")} {i}</td>
                    <td className="px-4 py-3">{ts("specialty")}</td>
                    <td className="px-4 py-3"><Badge tone={i === 1 ? "verified" : i === 2 ? "pending" : "unclaimed"}>{i === 1 ? "Verified" : i === 2 ? "Pending" : "Unclaimed"}</Badge></td>
                    <td className="px-4 py-3 tabular">{formatDate(when, "Asia/Riyadh", loc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="dialog" title={t("dialog")}>
          <Surface className="max-w-md shadow-[var(--shadow-card)]">
            <h3 className="text-lg font-bold">{t("dialogTitle")}</h3>
            <p className="mt-2 text-ink-700">{t("dialogBody")}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="secondary">{t("dialogKeep")}</Button>
              <Button variant="danger">{t("dialogCancel")}</Button>
            </div>
          </Surface>
        </Section>

        <Section id="emptyState" title={t("emptyState")}>
          <div className="max-w-md">
            <EmptyState title={t("emptyTitle")} body={t("emptyBody")} action={<Button>{t("emptyAction")}</Button>} />
          </div>
        </Section>

        <Section id="skeleton" title={t("skeleton")}>
          <div className="max-w-md space-y-3 rounded-[var(--radius-card)] border border-sand-200 bg-white p-5">
            <div className="flex gap-3">
              <Skeleton className="size-16 shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
            <p className="text-sm text-ink-500">{loc === "ar" ? "هيكل بشكل الصف الحقيقي، مع تسميات حقيقية. لا دوّارات فارغة." : "Shaped like the real row, with real labels. No bare spinners."}</p>
          </div>
        </Section>

        <Section id="icons" title={t("icons")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Surface>
              <h3 className="font-semibold text-success">{t("mirror")}</h3>
              <p className="mt-1 text-sm text-ink-700">{t("mirrorList")}</p>
              <p className="mt-3 flex items-center gap-2 text-sea-700"><ChevronNext className="size-6" /> <code className="text-xs">rtl:-scale-x-100</code></p>
            </Surface>
            <Surface>
              <h3 className="font-semibold text-danger">{t("noMirror")}</h3>
              <p className="mt-1 text-sm text-ink-700">{t("noMirrorList")}</p>
              <p className="mt-3 text-sm"><span className="ltr-run font-semibold">+966 50 123 4567</span> · <span className="ltr-run font-semibold">NPI 1234567890</span></p>
            </Surface>
          </div>
        </Section>
      </main>
      <footer className="border-t border-sand-200 py-6 text-center text-sm text-ink-500">3affya · built by ProgrammX · programmx.com</footer>
    </>
  );
}
