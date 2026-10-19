// Records progress loading state: same frame as /patient/records/<id>?state=loading.
import { ProgressSkeleton } from "../../_parts/ProgressSkeleton";

export default function Loading() {
  return <ProgressSkeleton />;
}
