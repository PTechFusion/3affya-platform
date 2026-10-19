// Loading state for the patient's summary (rule L1): the real trail back to Records, the real title, a skeleton for the
// framing line, then the summary skeleton with the real AI label, tab names and block titles.
import { Skeleton } from "@/components/ui";
import { SummaryViewerSkeleton } from "@/components/brand/SummaryViewer";
import { SummaryPageHeader } from "./SummaryPageHeader";

export function SummaryPageSkeleton() {
  return (
    <div>
      <SummaryPageHeader />
      <Skeleton className="mt-2 h-5 w-full max-w-xl" />
      <Skeleton className="mt-2 h-5 w-2/3 max-w-md" />
      <div className="mt-5">
        <SummaryViewerSkeleton tabs />
      </div>
    </div>
  );
}
