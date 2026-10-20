"use client";
// The Undo bar of the listings (rule B10): after a suspend, an unsuspend or a saved edit the list shows the change at once and
// offers Undo instead of having asked first (suspend asked once, for its reason). Undo puts the row back and lands on ?undone=,
// which says so without another Undo. The page keys this component by the change, so a new change starts a new bar.
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Toast, ToastRegion } from "@/components/ui";
import { undoListingChange } from "../actions";
import type { ToastView } from "./types";

export function ListingsToast({ toast, undoneHref }: { toast: ToastView | null; undoneHref: string | null }) {
  const t = useTranslations("adminListings.toast");
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(toast));
  const [failed, setFailed] = useState(false);
  const [pending, startUndo] = useTransition();
  const undoable = toast && toast.kind !== "undone" && undoneHref && !failed;

  const undo = () => {
    if (!toast || !undoneHref) return;
    startUndo(async () => {
      const result = await undoListingChange({ id: toast.id, kind: toast.kind }).catch(() => ({ ok: false as const }));
      if (result.ok) router.replace(undoneHref, { scroll: false });
      else setFailed(true);
    });
  };

  return (
    <ToastRegion>
      {toast && open ? (
        <Toast
          id="listings-toast"
          message={failed ? t("failed") : toast.message}
          actionLabel={undoable && !pending ? t("undo") : undefined}
          onAction={undoable ? undo : undefined}
          dismissLabel={t("dismiss")}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </ToastRegion>
  );
}
