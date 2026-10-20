// The record set is checked here, above this route's loading boundary, so an id with no summary gets a real 404 rather than
// one streamed after a 200 (same pattern as /professional/shared/[id]). Production also checks that the record set belongs to
// the signed-in patient (RLS); the prototype opens every sample record set as the signed-in patient's.
import { notFound } from "next/navigation";
import { summaryForRecordSet } from "@/lib/sample";

export default async function SummaryLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!summaryForRecordSet(id)) notFound();
  return children;
}
