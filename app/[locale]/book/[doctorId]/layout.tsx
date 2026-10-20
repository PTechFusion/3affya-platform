// The doctor id is checked here, above both booking routes' loading boundaries, so an unknown doctor gets a real 404 rather
// than a notFound() thrown after a streamed 200 (the same pattern as /doctors/[id]). The (picker) group keeps the picker's
// loading.tsx off the checkout route beside it.
import { notFound } from "next/navigation";
import { doctorById } from "@/lib/sample";

export default async function BookingLayout({ children, params }: { children: React.ReactNode; params: Promise<{ doctorId: string }> }) {
  const { doctorId } = await params;
  if (!doctorById(doctorId)) notFound();
  return children;
}
