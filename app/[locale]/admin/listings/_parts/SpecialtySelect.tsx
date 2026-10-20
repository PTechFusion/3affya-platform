"use client";
// The specialty filter applies as soon as it changes (rule S11, desktop: apply at once). Without JavaScript the form's Search
// button submits it with the query, so the filter still works.
import type { ComponentProps } from "react";
import { Select } from "@/components/ui";

export function SpecialtySelect(props: Omit<ComponentProps<typeof Select>, "onChange">) {
  return <Select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
