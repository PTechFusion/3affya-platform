// Screens 6 and 7, doctor profile (docs/screens/06-doctor-profile-unclaimed.md, 07-doctor-profile-verified.md), and the 410
// variant of screen 17. One route; the data decides the page: verified rows (doc_001..doc_008) get the bookable profile,
// pending (doc_009..doc_012) and unclaimed (doc_013..doc_020) rows get the registry page. doc_001 and doc_007 publish no
// times (the no-availability state). Prototype switches, on any id unless noted:
//   ?state=loading           the skeleton, same as loading.tsx
//   ?state=removed           410: the doctor asked to be removed (proxy.ts sets the status; production reads a removed flag)
//   ?state=removalPending    registry page: a removal request is waiting for review
//   ?state=invited           registry page: the patient's invite was sent
//   ?state=payoutsNotReady   verified page: payouts are not set up, so Book is hidden
// Viewer time zone and country via ?tz= and ?country= (lib/viewer.ts).
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { MissingPage } from "@/components/brand/MissingPage";
import { doctorById, removedDoctorIds, suspendedDoctorIds } from "@/lib/sample";
import { viewerFrom } from "@/lib/viewer";
import type { Locale } from "@/lib/format";
import { ProfileSkeleton } from "./_parts/ProfileSkeleton";
import { RegistryProfile } from "./_parts/RegistryProfile";
import { VerifiedProfile } from "./_parts/VerifiedProfile";

type SearchParams = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "profile" });
  const d = doctorById(id);
  if (!d || suspendedDoctorIds().has(id)) return {};
  if (sp.state === "removed") return { title: t("metaTitleRemoved"), robots: { index: false } };
  const ar = locale === "ar";
  const values = {
    name: ar ? d.nameAr : d.nameEn,
    specialty: ar ? d.specialtyAr : d.specialtyEn,
    city: ar ? d.cityAr : d.cityEn,
    gender: d.gender,
  };
  return {
    title: t("metaTitle", values),
    description: d.state === "verified" ? t("metaDescription", values) : t("metaDescriptionRegistry", values),
  };
}

export default async function DoctorProfile({ params, searchParams }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const doctor = doctorById(id);
  if (!doctor) notFound(); // the layout already answered 404; this narrows the type
  const viewer = viewerFrom(sp);
  const state = typeof sp.state === "string" ? sp.state : undefined;

  if (state === "loading") return <ProfileSkeleton />;
  // A confirmed removal (screen 41) answers 410 from proxy.ts; a suspension is reversible and must look like an unknown id.
  if (state === "removed" || removedDoctorIds().has(doctor.id)) return <MissingPage variant="removed" country={viewer.country} specialtySlug={doctor.specialty} />;
  if (doctor.state === "verified") {
    return <VerifiedProfile doctor={doctor} locale={locale as Locale} viewer={viewer} payoutsReady={state !== "payoutsNotReady"} />;
  }
  return (
    <RegistryProfile
      doctor={doctor}
      locale={locale as Locale}
      viewer={viewer}
      removalPending={state === "removalPending"}
      invited={state === "invited"}
    />
  );
}
