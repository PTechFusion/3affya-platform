// Public lookups a patient can use to check a credential claim themselves (rule X3). One list for every page that links to
// them (consolidation backlog: 02 and 14 still hold their own copies; move them here when those pages are next touched).
export const verifiers = {
  /** ABMS Certification Matters: US board certification. */
  board: { href: "https://www.certificationmatters.org/", domain: "certificationmatters.org" },
  /** FSMB DocInfo: US state medical licences. */
  licence: { href: "https://www.docinfo.org/", domain: "docinfo.org" },
} as const;
