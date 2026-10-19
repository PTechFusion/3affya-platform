// Locale-aware 404 (screen 17). app/[locale]/[...rest]/page.tsx calls notFound() so unknown paths land here with the layout.
import { MissingPage } from "@/components/brand/MissingPage";

export default function NotFound() {
  return <MissingPage variant="missing" />;
}
