"use client";
// Download or print, the primary action next to viewing (rule T1). Prototype: the browser's print dialog, where Save as PDF is
// the download; every tab prints because the viewer keeps the closed Overview and Flags in the page for print. Production
// serves a generated PDF from private storage through a short-lived link (task 3.9).
import { Button } from "@/components/ui";

export function DownloadSummary({ label }: { label: string }) {
  return (
    <Button type="button" onClick={() => window.print()} className="w-full sm:w-auto">
      {label}
    </Button>
  );
}
