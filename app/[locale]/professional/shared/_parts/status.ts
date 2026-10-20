// Share status to badge tone, so the list and anything else showing a share agree: new reads as information, viewed as
// neutral, reviewed as done (rule T4: the reviewed state carries through from the viewer to the list).
import type { BadgeTone } from "@/components/ui";
import type { ShareStatus } from "@/lib/sample";

export const shareStatusTone: Record<ShareStatus, BadgeTone> = { new: "info", viewed: "pending", reviewed: "success" };

// Days left and DAY_MS live in lib/format (shared with the patient's sharing page and the membership grace banner).
export { DAY_MS, daysLeft } from "@/lib/format";
