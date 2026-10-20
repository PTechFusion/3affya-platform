// Public lookups a patient can use to check a credential claim themselves (rule X3). One list for every page that links to
// them (consolidation backlog: 02 and 14 still hold their own copies; move them here when those pages are next touched).
export const verifiers = {
  /** ABMS Certification Matters: US board certification. */
  board: { href: "https://www.certificationmatters.org/", domain: "certificationmatters.org" },
  /** FSMB DocInfo: US state medical licences. */
  licence: { href: "https://www.docinfo.org/", domain: "docinfo.org" },
} as const;

/* ---------------- Credential review (screen 38, task 2.8) ---------------- */
// Appended block. The extra primary sources the admin review checklist links to (rule A1): the federal NPI registry for the
// identity behind a claim and the National Practitioner Data Bank for sanctions. State medical board lookups differ per state
// and are named in the checklist, not linked, until a checked list of board URLs exists.
export const reviewVerifiers = {
  /** NPPES NPI Registry: the national provider identifier behind every claim. */
  npiRegistry: { href: "https://npiregistry.cms.hhs.gov/", domain: "npiregistry.cms.hhs.gov" },
  /** National Practitioner Data Bank: licensure actions, exclusions and malpractice reports (registered entities query it). */
  npdb: { href: "https://www.npdb.hrsa.gov/", domain: "npdb.hrsa.gov" },
} as const;
