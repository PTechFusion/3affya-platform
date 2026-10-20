"use client";
// The Undo on the just-changed notice (rule B10: undo instead of a confirmation). It reverses the one change named in the URL
// and lands on the list with an "Undone" notice; on failure it says so beside the button and nothing else changes.
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui";
import { undoMembershipChange, type ChangeResult } from "../actions";
import type { MembershipChange } from "./shared";

export function UndoChange({ doctorId, change, undoneHref }: { doctorId: string; change: MembershipChange; undoneHref: string }) {
  const t = useTranslations("adminMembers");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  function undo() {
    setFailed(false);
    startTransition(async () => {
      let result: ChangeResult;
      try {
        result = await undoMembershipChange(doctorId, change);
      } catch {
        result = { ok: false, error: "unavailable" };
      }
      if (result.ok) router.replace(undoneHref, { scroll: false });
      else setFailed(true);
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" disabled={pending} onClick={undo}>
        {pending ? t("changed.undoing") : t("changed.undo")}
      </Button>
      {failed ? (
        <p role="alert" className="text-sm text-danger">
          {t("changed.undoFailed")}
        </p>
      ) : null}
    </>
  );
}
