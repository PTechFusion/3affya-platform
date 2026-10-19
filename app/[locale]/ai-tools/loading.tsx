// AI tools loading state (rule L1): the real frame, title and tool names render; the one-liners and the email field are
// content-shaped skeletons. The same blocks render at /ai-tools?state=loading for review.
import { SiteNav } from "@/components/brand/SiteNav";
import { AiToolsHeader, NotifyPanel, NotifySkeleton, SafetyNote, ToolList } from "./_parts/sections";

export default function Loading() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <AiToolsHeader />
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
          <ToolList skeleton />
          <div className="flex flex-col gap-6">
            <NotifyPanel>
              <NotifySkeleton />
            </NotifyPanel>
            <SafetyNote />
          </div>
        </div>
      </main>
    </>
  );
}
