// Removal queue loading state: the real frame with content-shaped rows (rule L1). /admin/removals/[id] has its own.
import { RemovalsSkeleton } from "./_parts/RemovalsSkeleton";

export default function Loading() {
  return <RemovalsSkeleton />;
}
