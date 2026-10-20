// Listings loading state (rule L1): the real frame with content-shaped skeletons. The page renders the same for ?state=loading.
import { ListingsSkeleton } from "./_parts/ListingsSkeleton";

export default function Loading() {
  return <ListingsSkeleton />;
}
