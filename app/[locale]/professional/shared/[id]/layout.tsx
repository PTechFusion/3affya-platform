// The share is checked here, above this route's loading boundary, so a share that does not exist, was made for another
// professional or has ended gets a real 404 rather than one streamed after a 200 (task 3.10: those links are refused).
import { notFound } from "next/navigation";
import { sampleProfessionalId, shareFor } from "@/lib/sample";

export default async function SharedSummaryLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!shareFor(id, sampleProfessionalId)) notFound();
  return children;
}
