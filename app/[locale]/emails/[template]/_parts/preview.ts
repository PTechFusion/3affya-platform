// Screen 49 preview query model: which view (the email, or its plain-text part), which sample, and the loading state. Everything
// is in the URL (rule S3), so each state can be opened, shared and screenshotted.
import type { TemplateName } from "@/lib/email-templates";
import { pickVariant } from "@/lib/email-templates/samples";

export type SearchParams = Record<string, string | string[] | undefined>;
export type PreviewView = "html" | "text";
export type PreviewQuery = { view: PreviewView; variant?: string; loading: boolean };

const one = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export function readQuery(name: TemplateName, sp: SearchParams): PreviewQuery {
  return {
    view: one(sp.view) === "text" ? "text" : "html",
    variant: pickVariant(name, one(sp.variant)),
    loading: one(sp.state) === "loading",
  };
}

/** The preview URL for a template, keeping the view and naming the sample only when the template has more than one. */
export function previewHref(name: TemplateName, q: { view?: PreviewView; variant?: string }): string {
  const params = new URLSearchParams();
  if (q.view === "text") params.set("view", "text");
  if (q.variant) params.set("variant", q.variant);
  const s = params.toString();
  return s ? `/emails/${name}?${s}` : `/emails/${name}`;
}
