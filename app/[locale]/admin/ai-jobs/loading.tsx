// AI jobs loading state: the same frame as /admin/ai-jobs?state=loading (tile labels, filters, table headings; values skeletal).
import { ListSkeleton } from "./_parts/Skeletons";

export default function Loading() {
  return <ListSkeleton />;
}
