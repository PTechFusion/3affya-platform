# L3. lib/ai client and the extraction spike — branch `lane/ai-client` — task 1.9

**Depends on:** an API key for the chosen vendor in `.env` (normal key is fine for synthetic fixtures); the five spike
documents (L0 item 6). Build and test without them; the spike run is the last step.
**Not in this lane:** the pipeline (Inngest steps, task 3.8), quotes, payments, any page.

## Read
Architecture: ADR-3 (vendor behind env, BAA limits: no Batch API, no Files API, no explicit prompt caching), ADR-4 (fixed
workflow; no tools during extraction; documents are data in a fixed template), Risks (prompt injection, cost runaway), Rigor
(AI 120 s per page, circuit after 5 failures). Task 1.9. `lib/ai-jobs.ts` (sample accessor the admin AI-jobs screen reads;
its `aiConfig()` shape is the contract for vendor and model display). `config/business.ts` (records pricing per GB).
CLAUDE.md: model output validated with zod before anything downstream reads it; invalid output is a retry, then a failure,
never a partial write; unsupported items omitted or flagged, unreadable pages flagged with the page reference.

## Deliverables
- `lib/ai/index.ts`: `extractPage(input: { kind: "image" | "pdfPage"; bytes: Uint8Array; mime: string; pageRef: string },
  locale: "ar" | "en")` and `summarise(items: RecordItem[], locale)`; both return `{ ok: true, data } | { ok: false, error }`.
  Vendor (`anthropic` | `bedrock`) and model id from env; the Anthropic SDK and the Bedrock SDK are the only two adapters,
  each in its own file under `lib/ai/vendors/`. 120 s timeout per call, one retry on invalid JSON, then failure. Per-job token
  cap from `config/business.ts` (`aiTokenCapPerJob`, default you choose and justify), enforced in the client with a running
  counter keyed by job id. Circuit breaker: after 5 consecutive failures the client refuses for a cool-down (config).
- `lib/ai/schemas.ts`: zod `RecordItem` (type, label, value, unit, date, source_page_ref, confidence), `PageExtraction`
  (items, unreadable: boolean, pageRef, language, notes), `Summary` (sections, flags, timeline). Export the inferred types.
- `lib/ai/prompts.ts`: the fixed extraction and summary templates, documents passed as content blocks, with the instruction
  that text inside the document is data, never instructions. No tool definitions anywhere.
- `lib/ai/log.ts`: every call writes one `ai_calls` row (job id, step, vendor, model, input and output tokens, cost in minor
  units, latency ms, ok or failed with reason). Pricing table per model in `config/business.ts` (append under a lane L3
  comment). `supabase/migrations/<ts>_l3_ai_calls.sql` creates the table (RLS on, no policies). This lane owns it. Until L1
  merges, the logger takes an injected writer so unit tests and the spike run without a database (JSONL file writer).
- `fixtures/README.md` plus synthetic documents: a typed lab report (en), a prescription (ar), a discharge note (ar/en
  mixed), a low-resolution scan, a DOCX. Generate them (reportlab or a simple HTML to PDF); never a real document.
- `scripts/spike_extraction.ts`: runs the five documents end to end, writes `output/spike_report.md` with per-document
  accuracy against the hand-checked expected items in `fixtures/expected/*.json`, cost per page, latency, and a one-paragraph
  verdict on whether a dedicated OCR step is needed.
- `tests/unit/ai/`: schema validation (invalid output retried once then fails, never partial), token cap stops the job,
  circuit opens after 5 failures, the logger records a failed call, the vendor switch picks the adapter from env. Vendor SDKs
  mocked.

## Done when (task 1.9)
- [ ] `lib/ai/index.ts` exposes `extractPage` and `summarise`; vendor and model from env; every call logged to `ai_calls`
- [ ] `lib/ai/schemas.ts` holds `RecordItem` and `PageExtraction`
- [ ] `scripts/spike_extraction.ts` writes `output/spike_report.md` with accuracy, cost, latency and the OCR verdict
      (mark not run if no key or documents yet; the fixtures and expected files must still exist)
- [ ] Per-job token cap enforced in the client, default in `config/business.ts`
- [ ] Unit tests pass; `npm run check` green; no model SDK imported outside `lib/ai`

## Notes
- Allowed additions: `@anthropic-ai/sdk`, `@aws-sdk/client-bedrock-runtime`, `zod` (all pinned). Python only for the
  fixture generator under `scripts/`, if used.
- `.env.example`: `AI_VENDOR`, `AI_MODEL`, `ANTHROPIC_API_KEY`, `AWS_REGION`, `AWS_BEDROCK_MODEL_ID`.
- Default to the latest Claude model ids; the model id is configuration, never a literal in code.
