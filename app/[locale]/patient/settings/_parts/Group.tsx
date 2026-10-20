// One settings group (layout call: a grouped list): a card with its heading, an optional lead and the controls. The section id
// is the anchor of the desktop "On this page" list; scroll-mt keeps the heading clear of the sticky portal header. The Delete
// group sets tone="danger": its heading turns red, the card itself stays the shared Surface.
import type { ReactNode } from "react";
import { Surface } from "@/components/ui";
import type { GroupId } from "./model";

export function Group({
  id,
  title,
  lead,
  tone = "default",
  children,
}: {
  id: GroupId;
  title: string;
  lead?: ReactNode;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28">
      <Surface className="flex flex-col gap-4">
        <div>
          <h2 id={`${id}-title`} className={["text-xl font-bold", tone === "danger" ? "text-danger" : "text-sea-900"].join(" ")}>
            {title}
          </h2>
          {lead ? <p className="mt-1 text-ink-700">{lead}</p> : null}
        </div>
        {children}
      </Surface>
    </section>
  );
}
