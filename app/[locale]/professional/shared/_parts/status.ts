// Share status to badge tone, so the list and anything else showing a share agree: new reads as information, viewed as
// neutral, reviewed as done (rule T4: the reviewed state carries through from the viewer to the list).
import type { BadgeTone } from "@/components/ui";
import type { ShareStatus } from "@/lib/sample";

export const shareStatusTone: Record<ShareStatus, BadgeTone> = { new: "info", viewed: "pending", reviewed: "success" };

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days left before the share ends; 0 in its last 24 hours ("Ends today"). */
export function daysLeft(expiresAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / DAY_MS));
}
