// The set is checked here, above this route's loading boundary, so another patient's set or an unknown id gets a real 404
// rather than one streamed after a 200 (overview acceptance: patient B asking for patient A's record gets a 404). The
// (progress) group keeps this check and the loading boundary off /patient/records/[id]/summary (screen 26).
import { notFound } from "next/navigation";
import { recordSetFor } from "@/lib/sample";

export default async function RecordSetLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!recordSetFor(id)) notFound();
  return children;
}
