// Resolves the doctor id above this route's loading boundary. notFound() inside the page runs after the skeleton has started
// streaming, which answers 200; here it runs before the first byte, so an unknown id gets a real 404 with the 404 page.
import { notFound } from "next/navigation";
import { sampleDoctors } from "@/lib/sample";

export default async function ThisIsMeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  if (!sampleDoctors.some((d) => d.id === id)) notFound();
  return children;
}
