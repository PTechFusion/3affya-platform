// Review queue loading state (rule L1): the real heading over rows shaped like the queue. The page renders this for
// ?state=loading too.
import { QueueSkeleton } from "./_parts/ReviewSkeleton";

export default function Loading() {
  return <QueueSkeleton />;
}
