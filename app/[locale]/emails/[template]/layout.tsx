// The email preview (screen 49) is a development tool, behind the same switch as the portals' "Viewing as" bar: a build without
// NEXT_PUBLIC_DEV_ROLE_SWITCH=1 answers 404 for every /emails route, and so does an unknown template name. Both checks sit in
// this layout, above the page's loading boundary, so the 404 status is decided before anything streams.
import { notFound } from "next/navigation";
import { devRoleSwitchEnabled } from "@/lib/dev-role";
import { isTemplateName } from "@/lib/email-templates";

export default async function EmailPreviewLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ template: string }>;
}) {
  if (!devRoleSwitchEnabled) notFound();
  const { template } = await params;
  if (!isTemplateName(template)) notFound();
  return children;
}
