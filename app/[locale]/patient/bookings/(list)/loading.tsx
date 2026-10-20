// Bookings loading state: the real frame with content-shaped skeletons (rule L1). The (list) group keeps it off the booking
// page (/patient/bookings/[id], screen 21), so that page's own not-found check can still answer a real 404.
import { BookingsSkeleton } from "../_parts/BookingsSkeleton";

export default function Loading() {
  return <BookingsSkeleton />;
}
