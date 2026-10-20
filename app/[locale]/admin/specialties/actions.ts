"use server";
// Specialty list (screen 40, task 2.8). Prototype stubs: each checks what the real version checks, then returns; nothing is
// stored, so a reload resets the list. Every action returns { ok, error } and never throws across the client boundary.
// Real versions (task 2.8): the caller must hold role admin with a fresh TOTP (checked in server code, and RLS on `specialties`
// allows writes to admins only); each write updates `specialties` (names, slug, body system, search words, shown) or the
// taxonomy mapping, writes an audit_log row with actor, target, old and new, and revalidates /specialties and the search index.
// The slug never changes once a specialty exists, so /search?specialty= links keep working.
import { adminSpecialties, sampleBodySystems, sampleDraftBodySystem } from "@/lib/sample";
import { checkSpecialty, type SpecialtyContext, type SpecialtyErrors, type SpecialtyInput, type SpecialtyValues } from "./_parts/validation";

export type SaveSpecialtyResult =
  | { ok: true; values: SpecialtyValues }
  | { ok: false; error: "validation"; fields: SpecialtyErrors }
  | { ok: false; error: "notFound" | "unavailable" };
export type ChangeResult = { ok: true } | { ok: false; error: "notFound" | "badOrder" | "unavailable" };

const systemIds = () => [...sampleBodySystems.map((b) => b.id), sampleDraftBodySystem.id];
const isStored = (slug: string) => adminSpecialties().some((s) => s.slug === slug);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Adds a specialty (`editing` absent) or saves one (`editing` is its slug). The stub knows only the stored sample rows, so a
 * specialty added on the page in this session is checked against those alone, and editing one passes the lookup.
 */
export async function saveSpecialty(input: SpecialtyInput, editing?: string): Promise<SaveSpecialtyResult> {
  try {
    if (editing !== undefined && !SLUG.test(editing)) return { ok: false, error: "notFound" };
    const rows = adminSpecialties();
    const ctx: SpecialtyContext = {
      others: rows.filter((r) => r.slug !== editing),
      systemIds: systemIds(),
      slugFixed: Boolean(editing),
    };
    const checked = checkSpecialty(editing ? { ...input, slug: editing } : input, ctx);
    if (!checked.ok) return { ok: false, error: "validation", fields: checked.errors };
    return { ok: true, values: checked.values };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

/** Shows or hides a specialty on the directory, in the search box and in the search filters (rule B10: undone from the bar). */
export async function setSpecialtyShown(slug: string, shown: boolean): Promise<ChangeResult> {
  try {
    void shown;
    return SLUG.test(slug) ? { ok: true } : { ok: false, error: "notFound" };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

/** The Undo of an add: removes a specialty added a moment ago. A stored specialty is refused; it may have doctors and links. */
export async function removeAddedSpecialty(slug: string): Promise<ChangeResult> {
  try {
    return isStored(slug) ? { ok: false, error: "notFound" } : { ok: true };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

/** Saves the order of the body systems on the directory: every known system exactly once. */
export async function saveSystemOrder(order: string[]): Promise<ChangeResult> {
  try {
    const known = systemIds();
    const valid = new Set(order).size === order.length && order.every((id) => known.includes(id));
    return valid ? { ok: true } : { ok: false, error: "badOrder" };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
