// Pieces shared by the directory page and its loading frame (screen 4), so both draw the same header, tile and row shapes.
import type { ReactNode } from "react";

/** Page header: title and one-line lead, on the sand page (no hero, so the tiles stay above the fold on phone). */
export function DirectoryHeader({ title, lead }: { title: string; lead: string }) {
  return (
    <header>
      <h1 className="text-3xl font-bold leading-tight text-sea-900 sm:text-5xl">{title}</h1>
      <p className="mt-1.5 text-lg text-ink-700 sm:mt-2 sm:text-xl">{lead}</p>
    </header>
  );
}

/** Tile frame for a curated specialty: the Surface tokens, laid out photo and badge on top, names under (rule R9). */
export const TILE_CLASS =
  "flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-sand-200 bg-white p-3 transition-colors sm:p-5";

/** Top row of a tile: the doctor's face at the start, the count at the end; a long count label drops under the face. */
export const TILE_TOP_CLASS = "flex flex-wrap items-start justify-between gap-2";

/** The doctor's face on a tile: the hook, so it grows with the tile. */
export const TILE_PHOTO_CLASS = "size-14 shrink-0 rounded-2xl sm:size-16 lg:size-20";

/** Grid for the six tiles: two columns on phone, three from tablet up. In RTL the first tile sits top-right (rule R9). */
export const TILE_GRID_CLASS = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4";

/**
 * A specialty name in the page language with the other language under it, small (rule S16). In the Arabic UI the English
 * name sits in parentheses; each line is its own direction run so the parentheses and Latin text never flip.
 */
export function SpecialtyNames({
  primary,
  secondary,
  locale,
  size = "row",
}: {
  primary: string;
  secondary: string;
  locale: string;
  size?: "tile" | "row";
}) {
  const ar = locale === "ar";
  return (
    <span className="flex flex-col">
      <span className={size === "tile" ? "text-base font-bold leading-snug text-sea-900 sm:text-lg" : "font-semibold leading-snug text-ink-900"}>{primary}</span>
      <span className="mt-0.5 text-sm text-ink-500">
        <bdi dir={ar ? "ltr" : "rtl"} lang={ar ? "en" : "ar"}>
          {ar ? `(${secondary})` : secondary}
        </bdi>
      </span>
    </span>
  );
}

/** Keeps a badge at its natural width inside a column flex layout. */
export function BadgeSlot({ children }: { children: ReactNode }) {
  return <span className="self-start">{children}</span>;
}
