// The patient's summary, loading: same frame as /patient/records/<id>/summary?state=loading.
import { SummaryPageSkeleton } from "./_parts/SummaryPageSkeleton";

export default function Loading() {
  return <SummaryPageSkeleton />;
}
