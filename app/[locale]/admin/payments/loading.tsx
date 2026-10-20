// Money screen loading state (rule L1): the real frame and labels with content-shaped skeletons, as ?state=loading shows.
import { PaymentsSkeleton } from "./_parts/PaymentsSkeleton";

export default function Loading() {
  return <PaymentsSkeleton />;
}
