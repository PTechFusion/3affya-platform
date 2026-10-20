// View shapes the specialty list page (server) hands its client editor. Names travel in both scripts: the table shows both.
import type { SpecialtyErrors, SpecialtyInput, SpecialtyValues } from "./validation";

export type SpecialtyRow = SpecialtyValues & {
  /** Verified doctors in the specialty (what the directory counts). */
  doctorCount: number;
  shown: boolean;
  /** The face on the directory tile: a verified doctor in the specialty; null while it has none. */
  photoUrl: string | null;
  /** Saved a moment ago: the row carries a "Just saved" mark until the next change. */
  fresh?: boolean;
};

export type SystemView = { id: string; nameAr: string; nameEn: string };

/** Column widths of the desktop table (xl up), shared with the loading frame: Arabic name, English name, slug and codes,
 *  search words, doctors, status with Hide or Show, Edit. */
export const TABLE_COLUMNS = ["w-[21%]", "w-[16%]", "w-[16%]", "w-[18%]", "w-[8%]", "w-[10%]", "w-[11%]"] as const;

/** A prototype state that opens on load, so each one can be reviewed from a URL. */
export type InitialSheet =
  | { mode: "add"; systemId?: string; values?: SpecialtyInput; errors?: SpecialtyErrors }
  | { mode: "edit"; slug: string; values?: SpecialtyInput; failed?: boolean };

export type InitialToast =
  | { kind: "saved"; slug: string; previous: SpecialtyRow }
  | { kind: "hidden"; slug: string };
