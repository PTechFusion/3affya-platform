# fixtures: synthetic documents for the extraction spike (task 1.9)

Every document here is **synthetic**: hand-written content, placeholder names ("Sample Patient A", "مريض تجريبي ب"),
fictitious clinics, and a footer on every page saying it is a synthetic test document. No real patient document may ever be
placed here, on a developer machine or on the VPS (CLAUDE.md). When Dr Ayman or Yasir supplies real documents for the
spike (L0 item 6), they are run in production only, never committed.

## The documents

| Id | File | Kind | Language | Pages | What it tests |
|---|---|---|---|---|---|
| `lab-report-en` | `documents/lab-report-en.pdf` | typed PDF | English | 1 | A dense results table: values, units with superscripts, reference ranges, a `< 3.0` range, decimals kept ("2.10") |
| `prescription-ar` | `documents/prescription-ar.pdf` | typed PDF | Arabic | 1 | Right-to-left layout, Arabic-Indic digits (٥٠٠ ملغ), Arabic units, a dated prescription |
| `discharge-note-mixed` | `documents/discharge-note-mixed.p1.pdf`, `.p2.pdf` | typed PDF | Arabic and English mixed | 2 | Bidirectional lines, vitals, an immunization, a referenced CT report that was not uploaded (a "missing" flag), "no known drug allergies" against another document's penicillin allergy (a "conflict" flag) |
| `scan-lowres` | `documents/scan-lowres.jpg` | image | Arabic | 1 | A rasterised page downscaled to about 70 dpi, blurred, rotated 1.1°, grain and specks, JPEG quality 0.42: the low-resolution scan ADR-3's spike asks for |
| `referral-letter` | `documents/referral-letter.docx` | DOCX | English (one Arabic line) | 1 | A Word document with a results table; a 1,000 mg metformin dose against 500 mg elsewhere (a "conflict" flag) |
| `injection-note` | `documents/injection-note.pdf` | typed PDF | English | 1 | A page that tells the AI to drop the allergy and add "Patient is healthy" (the task 3.8 injection fixture); checked by the spike apart from the five |

The five spike documents are the first five; the spike report's accuracy totals are over them. The injection page is
reported in its own section.

## How they are made

`node fixtures/generate.mjs` rewrites `documents/` from `source/`:

- The HTML sources are printed to A4 PDFs by Chromium (Playwright, already a dev dependency), which shapes Arabic
  correctly. A two-page source is also printed one page at a time (`.p1.pdf`, `.p2.pdf`), because `extractPage` reads one
  page per call and splitting an uploaded PDF is task 3.7's validate step, not the spike's.
- The scan is `source/scan-lowres.html` rendered at 794 x 1123 px, then degraded in a canvas with a seeded noise generator,
  so a rerun gives the same image.
- The DOCX is written from `source/referral-letter.json` as Office Open XML in a zip, without a library.

PDFs carry Chromium's creation time, so a rerun changes their bytes but not their content. When a source changes, change
its expected file in the same commit; `tests/unit/ai/spike.test.ts` fails when an expected label, value or unit is not
printed in its source.

## How each kind enters extractPage

`extractPage` takes a page as `image` or `pdfPage` (task 1.9). PDFs are split into single-page PDFs and each page is a
`pdfPage`; JPG and PNG uploads are one `image` page each.

**Decision: a DOCX enters the pipeline as PDF pages.** Validation (task 3.7) converts the DOCX to PDF, then it is split
and read like any uploaded PDF, page by page as `pdfPage`. Why: `extractPage` takes images and PDF pages only; a PDF page
gives the model both the text and the rendered layout (tables, right-to-left paragraphs, superscripts), which plain
extracted text loses; every item keeps a page reference to a real page the patient and the doctor can open in the page
viewer (screen 26); and one path means one prompt and one set of checks. A DOCX has no fixed pages of its own, so the
page numbers are those of the converted PDF.

For the spike, `scripts/spike_extraction.ts` converts with a minimal converter of its own (unzip, Word XML paragraphs,
breaks and tables to HTML, Chromium print, one PDF per page), which is enough for this letter. The production converter
(LibreOffice headless in the worker, or a conversion service) is task 3.7's choice; it is an open question in the L3 report.

## Expected items

`expected/<id>.json` lists, per page, the items a careful human reads on that page, written by hand to match exactly what
the source prints:

```json
{ "type": "result", "label": "Haemoglobin", "aliases": ["Hemoglobin", "Hb"], "value": "13.1", "unit": "g/dL",
  "date": "2026-09-14", "ref_low": 12.0, "ref_high": 15.5 }
```

- `type` is one of the `record_items.type` values (L1's enum, `lib/ai/schemas.ts`).
- `label` is the item as printed; `aliases` are other names a correct reading may use (the English name of an Arabic
  item, an abbreviation). Patient names, record numbers, dates of birth and contact details are never items.
- `value`, `unit` and `date` are as printed, with Western digits and dates as YYYY-MM-DD. A `date` is given only where the
  page gives one for the item (a lab report's collection date for its results); `null` means the item is not scored on
  its date.
- The injection page also lists `forbidden` phrases no extracted item may carry.

The spike matches an extracted item to an expected one by label or alias and value; type, unit and date are scored on the
matched pairs. Its report lists every expected item with what the model wrote for it, and every extracted item that
matches nothing, for the hand check.
