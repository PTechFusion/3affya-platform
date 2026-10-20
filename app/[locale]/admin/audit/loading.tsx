// Audit log loading state (rule L1): the real heading, filter labels, zone and column names with rows as skeletons. The page
// renders the same frame for ?state=loading.
import { AuditSkeleton } from "./_parts/AuditSkeleton";

export default function Loading() {
  return <AuditSkeleton />;
}
