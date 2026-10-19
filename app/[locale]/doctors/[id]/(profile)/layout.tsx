// The doctor id is checked here, above this route's loading boundary, so an unknown doctor gets a real 404: a notFound() thrown
// inside the streamed page would arrive after the 200 was sent. The (profile) group keeps this layout and loading.tsx off the
// sibling routes under /doctors/[id] (this-is-me, screen 10).
import { notFound } from "next/navigation";
import { doctorById } from "@/lib/sample";

export default async function ProfileLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!doctorById(id)) notFound();
  return children;
}
