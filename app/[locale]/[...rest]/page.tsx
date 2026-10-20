import { notFound } from "next/navigation";

// Catch-all so unknown paths under a locale render app/[locale]/not-found.tsx inside the locale layout.
export default function CatchAll() {
  notFound();
}
