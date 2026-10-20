// Content-shaped skeletons for the inbox (rule L1): the real section headings over rows shaped like InboxList rows.
import { Skeleton, Surface } from "@/components/ui";

export function SectionsSkeleton({ labels, rows = 2 }: { labels: string[]; rows?: number }) {
  return (
    <div className="flex flex-col gap-6">
      {labels.map((label) => (
        <section key={label}>
          <h2 className="mb-3 text-lg font-bold text-sea-900">{label}</h2>
          <Surface>
            <ul className="@container -my-3 divide-y divide-sand-200">
              {Array.from({ length: rows }, (_, i) => (
                <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 @lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_6rem]">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-6 w-20 rounded-[var(--radius-tag)]" />
                  </div>
                  <Skeleton className="col-span-2 h-4 w-56 max-w-full @lg:col-span-1" />
                  <Skeleton className="col-start-2 row-start-1 h-12 w-20 justify-self-end rounded-[var(--radius-field)] @lg:col-start-3" />
                </li>
              ))}
            </ul>
          </Surface>
        </section>
      ))}
    </div>
  );
}
