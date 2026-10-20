// Resolves the doctor id above this route's loading boundary. notFound() inside the page runs after the skeleton has started
// streaming, which answers 200; here it runs before the first byte, so an unknown id gets a real 404 with the 404 page.
import { notFound } from "next/navigation";
import { removedDoctorIds, sampleDoctors, suspendedDoctorIds } from "@/lib/sample";

export default async function ThisIsMeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  // Suspended and removed doctors cannot be claimed either (the profile is not public); they read as unknown here.
  if (!sampleDoctors.some((d) => d.id === id) || removedDoctorIds().has(id) || suspendedDoctorIds().has(id)) notFound();
  return children;
}
