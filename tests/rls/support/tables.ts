// The cross-tenant matrix as data: for each of the 26 L1 tables, the row an attacker aims at for each operation and who
// may legitimately read it (the positive control that keeps a refusal from being vacuous). matrix.rls.ts runs every case
// as patient A, professional A and anonymous; controls.rls.ts runs the write half again as an aal2 admin, who writes
// through server code only. "B" rows belong to the other tenant (patient B, professional B); the read target of a table
// whose B rows are public by design (listings, their specialty links, tags and availability) is the pending_review
// listing's row instead, which nobody but its owner and an admin may read.
import { aiLimits, business, outreach } from "../../../config/business";
import { DAY, HOUR, isoIn, PDF, randomHex, type PersonaKey, type World } from "./fixtures";
import type { Match, Row } from "./refusal";

export const TABLES = [
  "profiles",
  "specialties",
  "professionals",
  "professional_private",
  "professional_specialties",
  "expertise_tags",
  "credentials",
  "availability_rules",
  "availability_exceptions",
  "slot_holds",
  "bookings",
  "receipts",
  "refunds",
  "memberships",
  "banners",
  "invites",
  "removal_requests",
  "record_sets",
  "record_files",
  "record_pages",
  "record_items",
  "record_summaries",
  "record_shares",
  "consents",
  "ai_jobs",
  "audit_log",
] as const;
export type TableName = (typeof TABLES)[number];

// Public tables other lanes own; their own suites cover them (lanes README, table ownership).
export const OTHER_LANE_TABLES = ["stripe_events", "ai_calls"] as const;

export const CROSS_TENANT_ATTACKERS = ["patientA", "professionalA", "anon"] as const;
export type Attacker = (typeof CROSS_TENANT_ATTACKERS)[number] | "admin";

export interface Target {
  match: Match;
  /** A persona allowed to read this row: the control run before the refusals. */
  owner: PersonaKey;
}

export interface TableCase {
  table: TableName;
  /** Whose rows these are and who may touch them, one line for the README. */
  tenancy: string;
  /** The row the attacker must not read, plus filters that must return none of that tenant's rows. */
  read: (w: World) => Target & { tenantFilters: Match[] };
  /** A row placed in the other tenant's space, otherwise valid, so only RLS or a missing grant can refuse it. */
  insert: (w: World, attacker: Attacker) => Row;
  update: (w: World, attacker: Attacker) => Target & { values: Row };
  remove: (w: World) => Target;
}

const ATTACKER_INDEX: Record<Attacker, number> = { patientA: 0, professionalA: 1, anon: 2, admin: 3 };
const now = () => new Date().toISOString();
const tagOf = (w: World, attacker: Attacker) => `${w.runId}${attacker.toLowerCase()}`;
const tenants = (...filters: Match[]): Match[] => filters;

export const TABLE_CASES: readonly TableCase[] = [
  {
    table: "profiles",
    tenancy: "one row per account; the account reads and updates its own (column-limited); admin (aal2) reads all",
    read: (w) => ({ match: { id: w.user("patientB") }, owner: "patientB", tenantFilters: tenants({ id: w.user("patientB") }) }),
    insert: (w) => ({ id: w.user("patientB"), name_en: "Injected" }),
    update: (w) => ({ match: { id: w.user("patientB") }, owner: "patientB", values: { name_en: "Changed by another tenant" } }),
    remove: (w) => ({ match: { id: w.user("patientB") }, owner: "patientB" }),
  },
  {
    table: "specialties",
    tenancy: "no tenant; shown rows public, hidden rows admin-only; writes only by server code",
    read: (w) => ({
      match: { id: w.ids.specialtyHidden },
      owner: "admin",
      tenantFilters: tenants({ id: w.ids.specialtyHidden }, { shown: false }),
    }),
    insert: (w, attacker) => ({ slug: `rls-test-${tagOf(w, attacker)}`, name_en: "Injected", name_ar: "Injected" }),
    update: (w) => ({ match: { id: w.ids.specialtyShown }, owner: "anon", values: { name_en: "Changed", shown: false } }),
    remove: (w) => ({ match: { id: w.ids.specialtyShown }, owner: "anon" }),
  },
  {
    table: "professionals",
    tenancy: "verified and unclaimed listings public; the owner reads and edits its own (guarded); admin (aal2) reads all",
    read: (w) => ({
      match: { id: w.ids.professionalPending },
      owner: "professionalPending",
      tenantFilters: tenants({ id: w.ids.professionalPending }, { status: "pending_review" }),
    }),
    insert: (w, attacker) => ({
      npi: w.newNpi(),
      first_name: "Injected",
      last_name: `Row${tagOf(w, attacker)}`,
      name_en: "Dr Injected Row",
    }),
    update: (w) => ({ match: { id: w.ids.professionalB }, owner: "professionalB", values: { bio_en: "Changed by another tenant" } }),
    remove: (w) => ({ match: { id: w.ids.professionalB }, owner: "professionalB" }),
  },
  {
    table: "professional_private",
    tenancy: "one row per listing; only its professional (video link, licence number) and admin (aal2)",
    read: (w) => ({
      match: { professional_id: w.ids.professionalB },
      owner: "professionalB",
      tenantFilters: tenants({ professional_id: w.ids.professionalB }),
    }),
    insert: (w) => ({ professional_id: w.ids.professionalB, video_link: "https://attacker.example.com/room" }),
    update: (w) => ({
      match: { professional_id: w.ids.professionalB },
      owner: "professionalB",
      values: { video_link: "https://attacker.example.com/room" },
    }),
    remove: (w) => ({ match: { professional_id: w.ids.professionalB }, owner: "professionalB" }),
  },
  {
    table: "professional_specialties",
    tenancy: "children of a listing; public with a public listing; writes only by server code",
    read: (w) => ({
      match: { professional_id: w.ids.professionalPending, specialty_id: w.ids.specialtyShown },
      owner: "professionalPending",
      tenantFilters: tenants({ professional_id: w.ids.professionalPending }),
    }),
    insert: (w) => ({ professional_id: w.ids.professionalB, specialty_id: w.ids.specialtyHidden }),
    update: (w) => ({
      match: { professional_id: w.ids.professionalB, specialty_id: w.ids.specialtyShown },
      owner: "professionalB",
      values: { is_primary: false },
    }),
    remove: (w) => ({ match: { professional_id: w.ids.professionalB, specialty_id: w.ids.specialtyShown }, owner: "professionalB" }),
  },
  {
    table: "expertise_tags",
    tenancy: "children of a listing; public with a public listing; the professional writes its own",
    read: (w) => ({
      match: { id: w.ids.tagPending },
      owner: "professionalPending",
      tenantFilters: tenants({ professional_id: w.ids.professionalPending }),
    }),
    insert: (w, attacker) => ({
      professional_id: w.ids.professionalB,
      locale: "ar",
      title: "Injected",
      position: 6 + ATTACKER_INDEX[attacker],
    }),
    update: (w) => ({ match: { id: w.ids.tagB }, owner: "professionalB", values: { title: "Changed" } }),
    remove: (w) => ({ match: { id: w.ids.tagB }, owner: "professionalB" }),
  },
  {
    table: "credentials",
    tenancy: "the professional's uploaded licence and board files; the professional and admin (aal2)",
    read: (w) => ({
      match: { id: w.ids.credentialB },
      owner: "professionalB",
      tenantFilters: tenants({ professional_id: w.ids.professionalB }),
    }),
    insert: (w, attacker) => ({
      professional_id: w.ids.professionalB,
      kind: "other",
      file_name: "injected.pdf",
      storage_path: `${w.ids.professionalB}/injected-${tagOf(w, attacker)}.pdf`,
      mime_type: PDF,
      size_bytes: 1024,
    }),
    update: (w) => ({ match: { id: w.ids.credentialB }, owner: "professionalB", values: { file_name: "changed.pdf" } }),
    remove: (w) => ({ match: { id: w.ids.credentialB }, owner: "professionalB" }),
  },
  {
    table: "availability_rules",
    tenancy: "weekly hours of a listing; public for verified listings only; the professional writes its own",
    read: (w) => ({
      match: { id: w.ids.rulePending },
      owner: "professionalPending",
      tenantFilters: tenants({ professional_id: w.ids.professionalPending }),
    }),
    insert: (w, attacker) => ({
      professional_id: w.ids.professionalB,
      time_zone: "UTC",
      starts_at: isoIn(40 * DAY + ATTACKER_INDEX[attacker] * HOUR),
      ends_at: isoIn(40 * DAY + ATTACKER_INDEX[attacker] * HOUR + HOUR / 2),
    }),
    update: (w) => ({ match: { id: w.ids.ruleB }, owner: "professionalB", values: { time_zone: "UTC" } }),
    remove: (w) => ({ match: { id: w.ids.ruleB }, owner: "professionalB" }),
  },
  {
    table: "availability_exceptions",
    tenancy: "dated changes to a listing's hours; public for verified listings only; the professional writes its own",
    read: (w) => ({
      match: { id: w.ids.exceptionPending },
      owner: "professionalPending",
      tenantFilters: tenants({ professional_id: w.ids.professionalPending }),
    }),
    insert: (w, attacker) => ({
      professional_id: w.ids.professionalB,
      kind: "extra",
      starts_at: isoIn(41 * DAY + ATTACKER_INDEX[attacker] * HOUR),
      ends_at: isoIn(41 * DAY + ATTACKER_INDEX[attacker] * HOUR + HOUR / 2),
    }),
    update: (w) => ({ match: { id: w.ids.exceptionB }, owner: "professionalB", values: { kind: "extra" } }),
    remove: (w) => ({ match: { id: w.ids.exceptionB }, owner: "professionalB" }),
  },
  {
    table: "slot_holds",
    tenancy: "the patient's hold on a slot; the patient (create, read, let go) and admin (aal2)",
    read: (w) => ({
      match: { id: w.ids.holdB },
      owner: "patientB",
      tenantFilters: tenants({ patient_id: w.user("patientB") }, { professional_id: w.ids.professionalB }),
    }),
    insert: (w, attacker) => ({
      professional_id: w.ids.professionalB,
      patient_id: w.user("patientB"),
      ...w.slot(10 + ATTACKER_INDEX[attacker]),
      expires_at: isoIn(business.slotHoldMinutes * 60_000),
      visit_type: "video",
    }),
    update: (w) => ({ match: { id: w.ids.holdB }, owner: "patientB", values: { concern: "Changed" } }),
    remove: (w) => ({ match: { id: w.ids.holdB }, owner: "patientB" }),
  },
  {
    table: "bookings",
    tenancy: "the patient's booking with a professional; both read it; patient ticks prepared, professional sets done_at",
    read: (w) => ({
      match: { id: w.ids.bookingB },
      owner: "patientB",
      tenantFilters: tenants({ patient_id: w.user("patientB") }, { professional_id: w.ids.professionalB }),
    }),
    insert: (w, attacker) => ({
      professional_id: w.ids.professionalB,
      patient_id: w.user("patientB"),
      payment_intent_id: `pi_rlsinjected_${tagOf(w, attacker)}`,
      visit_type: "video",
      starts_at: w.slot(30 + ATTACKER_INDEX[attacker]).slot_start,
      ends_at: w.slot(30 + ATTACKER_INDEX[attacker]).slot_end,
      patient_time_zone: business.defaultTimeZone,
      professional_time_zone: "America/New_York",
      currency: business.currencyPresentment,
      doctor_fee_cents: w.fees.doctorFeeCents,
      platform_fee_cents: w.fees.platformFeeCents,
      card_processing_cents: w.fees.cardProcessingCents,
    }),
    update: (w, attacker) => ({
      match: { id: w.ids.bookingB },
      owner: "patientB",
      values: attacker === "professionalA" ? { done_at: now() } : { prepared: ["records"] },
    }),
    remove: (w) => ({ match: { id: w.ids.bookingB }, owner: "patientB" }),
  },
  {
    table: "receipts",
    tenancy: "the patient's payment receipt; the patient and admin (aal2); written by the webhook only",
    read: (w) => ({
      match: { id: w.ids.receiptB },
      owner: "patientB",
      tenantFilters: tenants({ patient_id: w.user("patientB") }, { booking_id: w.ids.bookingB }),
    }),
    insert: (w, attacker) => ({
      booking_id: w.ids.bookingB,
      patient_id: w.user("patientB"),
      receipt_number: `RLS-INJ-${tagOf(w, attacker)}`,
      currency: business.currencyPresentment,
      amount_cents: w.fees.totalCents,
      paid_at: now(),
      stripe_payment_intent_id: `pi_rlsinjected_${tagOf(w, attacker)}`,
    }),
    update: (w) => ({ match: { id: w.ids.receiptB }, owner: "patientB", values: { card_last4: "0000" } }),
    remove: (w) => ({ match: { id: w.ids.receiptB }, owner: "patientB" }),
  },
  {
    table: "refunds",
    tenancy: "refunds of the patient's payment; the patient and admin (aal2); written by server code only",
    read: (w) => ({
      match: { id: w.ids.refundB },
      owner: "patientB",
      tenantFilters: tenants({ patient_id: w.user("patientB") }, { booking_id: w.ids.bookingB }),
    }),
    insert: (w, attacker) => ({
      booking_id: w.ids.bookingB,
      patient_id: w.user("patientB"),
      amount_cents: w.fees.totalCents,
      currency: business.currencyPresentment,
      reason: "override",
      initiated_by: "admin",
      idempotency_key: `rls-test-injected-${tagOf(w, attacker)}`,
    }),
    update: (w) => ({ match: { id: w.ids.refundB }, owner: "patientB", values: { status: "succeeded", succeeded_at: now() } }),
    remove: (w) => ({ match: { id: w.ids.refundB }, owner: "patientB" }),
  },
  {
    table: "memberships",
    tenancy: "the professional's membership; the professional and admin (aal2); written by the webhook only",
    read: (w) => ({
      match: { id: w.ids.membershipB },
      owner: "professionalB",
      tenantFilters: tenants({ professional_id: w.ids.professionalB }),
    }),
    insert: (w) => ({ professional_id: w.ids.professionalB, status: "active", interval: "month" }),
    update: (w) => ({ match: { id: w.ids.membershipB }, owner: "professionalB", values: { status: "cancelled", cancelled_at: now() } }),
    remove: (w) => ({ match: { id: w.ids.membershipB }, owner: "professionalB" }),
  },
  {
    table: "banners",
    tenancy: "the professional's banner add-on; the professional and admin (aal2); written by the webhook only",
    read: (w) => ({
      match: { id: w.ids.bannerB },
      owner: "professionalB",
      tenantFilters: tenants({ professional_id: w.ids.professionalB }),
    }),
    insert: (w) => ({ professional_id: w.ids.professionalB, active: true }),
    update: (w) => ({ match: { id: w.ids.bannerB }, owner: "professionalB", values: { active: false } }),
    remove: (w) => ({ match: { id: w.ids.bannerB }, owner: "professionalB" }),
  },
  {
    table: "invites",
    tenancy: "no tenant; admin-only (aal2) read; written by server code only",
    read: (w) => ({ match: { id: w.ids.inviteB }, owner: "admin", tenantFilters: tenants({ professional_id: w.ids.professionalB }) }),
    insert: (w, attacker) => ({
      professional_id: w.ids.professionalB,
      email: `rls-injected-${tagOf(w, attacker)}@example.com`,
      token_hash: randomHex(32),
      expires_at: isoIn(outreach.inviteValidDays * DAY),
    }),
    update: (w) => ({ match: { id: w.ids.inviteB }, owner: "admin", values: { revoked_at: now() } }),
    remove: (w) => ({ match: { id: w.ids.inviteB }, owner: "admin" }),
  },
  {
    table: "removal_requests",
    tenancy: "no tenant; admin-only (aal2) read; written by server code only",
    read: (w) => ({ match: { id: w.ids.removalB }, owner: "admin", tenantFilters: tenants({ professional_id: w.ids.professionalB }) }),
    insert: (w, attacker) => ({
      professional_id: w.ids.professionalB,
      requester_name: "Injected",
      requester_email: `rls-injected-${tagOf(w, attacker)}@example.com`,
      npi: w.npis.professionalB,
      reason: "other",
      locale: "en",
    }),
    update: (w) => ({ match: { id: w.ids.removalB }, owner: "admin", values: { status: "refused", decided_at: now() } }),
    remove: (w) => ({ match: { id: w.ids.removalB }, owner: "admin" }),
  },
  {
    table: "record_sets",
    tenancy: "the patient's record set; the patient (create draft, read, delete), a live share's professional (read), admin",
    read: (w) => ({ match: { id: w.ids.setB }, owner: "patientB", tenantFilters: tenants({ patient_id: w.user("patientB") }) }),
    insert: (w) => ({ patient_id: w.user("patientB") }),
    update: (w) => ({ match: { id: w.ids.setB }, owner: "patientB", values: { status: "cancelled", cancelled_at: now() } }),
    remove: (w) => ({ match: { id: w.ids.setBDraft }, owner: "patientB" }),
  },
  {
    table: "record_files",
    tenancy: "files of the patient's set; the patient (upload while draft), a live share's professional (read), admin",
    read: (w) => ({
      match: { id: w.ids.fileB },
      owner: "patientB",
      tenantFilters: tenants({ patient_id: w.user("patientB") }, { set_id: w.ids.setB }),
    }),
    insert: (w, attacker) => ({
      set_id: w.ids.setBDraft,
      patient_id: w.user("patientB"),
      position: 5 + ATTACKER_INDEX[attacker],
      name: "injected.pdf",
      kind: "pdf",
      mime_type: PDF,
      size_bytes: 1024,
      storage_path: `${w.user("patientB")}/${w.ids.setBDraft}/injected-${tagOf(w, attacker)}.pdf`,
    }),
    update: (w) => ({ match: { id: w.ids.fileB }, owner: "patientB", values: { name: "changed.pdf" } }),
    remove: (w) => ({ match: { id: w.ids.fileBDraft }, owner: "patientB" }),
  },
  {
    table: "record_pages",
    tenancy: "pages of the patient's set; read by the patient, a live share's professional and admin; pipeline writes",
    read: (w) => ({
      match: { id: w.ids.pageB },
      owner: "patientB",
      tenantFilters: tenants({ patient_id: w.user("patientB") }, { set_id: w.ids.setB }),
    }),
    insert: (w, attacker) => ({
      set_id: w.ids.setB,
      file_id: w.ids.fileB,
      patient_id: w.user("patientB"),
      page_number: 2 + ATTACKER_INDEX[attacker],
      set_page_number: 2 + ATTACKER_INDEX[attacker],
    }),
    update: (w) => ({ match: { id: w.ids.pageB }, owner: "patientB", values: { status: "unreadable", unreadable_reason: "blurry" } }),
    remove: (w) => ({ match: { id: w.ids.pageB }, owner: "patientB" }),
  },
  {
    table: "record_items",
    tenancy: "typed items of the patient's set; read by the patient, a live share's professional and admin",
    read: (w) => ({
      match: { id: w.ids.itemB },
      owner: "patientB",
      tenantFilters: tenants({ patient_id: w.user("patientB") }, { set_id: w.ids.setB }),
    }),
    insert: (w) => ({
      set_id: w.ids.setB,
      patient_id: w.user("patientB"),
      source_page_id: w.ids.pageB,
      type: "other",
      label: "Injected item",
    }),
    update: (w) => ({ match: { id: w.ids.itemB }, owner: "patientB", values: { label: "Changed" } }),
    remove: (w) => ({ match: { id: w.ids.itemB }, owner: "patientB" }),
  },
  {
    table: "record_summaries",
    tenancy: "the summary of the patient's set; read by the patient, a live share's professional (marks reviewed), admin",
    read: (w) => ({
      match: { id: w.ids.summaryB },
      owner: "patientB",
      tenantFilters: tenants({ patient_id: w.user("patientB") }, { set_id: w.ids.setB }),
    }),
    insert: (w) => ({ set_id: w.ids.setBDraft, patient_id: w.user("patientB"), data: { injected: true } }),
    update: (w) => ({
      match: { id: w.ids.summaryB },
      owner: "patientB",
      values: { reviewed_by_professional_id: w.ids.professionalA, reviewed_at: now() },
    }),
    remove: (w) => ({ match: { id: w.ids.summaryB }, owner: "patientB" }),
  },
  {
    table: "record_shares",
    tenancy: "the patient's share of a summary with one professional; the patient, that professional while live, admin",
    read: (w) => ({
      match: { id: w.ids.shareB },
      owner: "patientB",
      tenantFilters: tenants({ patient_id: w.user("patientB") }, { professional_id: w.ids.professionalB }),
    }),
    insert: (w) => ({
      summary_id: w.ids.summaryB,
      patient_id: w.user("patientB"),
      professional_id: w.ids.professionalA,
      expires_at: isoIn(business.shareDefaultDays * DAY),
    }),
    update: (w, attacker) => ({
      match: { id: w.ids.shareB },
      owner: "patientB",
      values: attacker === "professionalA" ? { viewed_at: now() } : { revoked_at: now() },
    }),
    remove: (w) => ({ match: { id: w.ids.shareB }, owner: "patientB" }),
  },
  {
    table: "consents",
    tenancy: "the account's consent records; the account (grant, withdraw) and admin (aal2)",
    read: (w) => ({ match: { id: w.ids.consentB }, owner: "patientB", tenantFilters: tenants({ user_id: w.user("patientB") }) }),
    insert: (w) => ({ user_id: w.user("patientB"), kind: "recordsShare", copy_version: "rlsTest.v1", locale: "en" }),
    update: (w) => ({ match: { id: w.ids.consentB }, owner: "patientB", values: { withdrawn_at: now() } }),
    remove: (w) => ({ match: { id: w.ids.consentB }, owner: "patientB" }),
  },
  {
    table: "ai_jobs",
    tenancy: "no tenant column (hangs off a set); admin-only (aal2) read; written by the pipeline only",
    read: (w) => ({ match: { id: w.ids.aiJobB }, owner: "admin", tenantFilters: tenants({ set_id: w.ids.setB }) }),
    insert: (w, attacker) => ({
      set_id: w.ids.setB,
      attempt: 2 + ATTACKER_INDEX[attacker],
      idempotency_key: `rls-test-injected-${tagOf(w, attacker)}`,
      cost_currency: aiLimits.costCurrency,
    }),
    update: (w) => ({ match: { id: w.ids.aiJobB }, owner: "admin", values: { status: "cancelled", cancelled_at: now() } }),
    remove: (w) => ({ match: { id: w.ids.aiJobB }, owner: "admin" }),
  },
  {
    table: "audit_log",
    tenancy: "no tenant; admin-only (aal2) read; append-only; a signed-in user appends rows naming itself",
    read: (w) => ({ match: { id: w.ids.auditRow }, owner: "admin", tenantFilters: tenants({ target_id: w.auditTargetId }) }),
    insert: (w, attacker) => {
      // Naming someone else as the actor: the other tenant of the attacker's own kind.
      const professional = attacker === "professionalA";
      return {
        actor_id: w.user(professional ? "professionalB" : "patientB"),
        actor_kind: professional ? "professional" : "patient",
        action: "rlsTest.injected",
        target_type: "rlsTest",
        target_id: `rls-test-injected-${tagOf(w, attacker)}`,
      };
    },
    update: (w) => ({ match: { id: w.ids.auditRow }, owner: "admin", values: { action: "rlsTest.tampered" } }),
    remove: (w) => ({ match: { id: w.ids.auditRow }, owner: "admin" }),
  },
];
