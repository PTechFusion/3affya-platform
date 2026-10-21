// Task 2.9 test send: every transactional email in both languages to one inbox, for the Gmail and Outlook check (right to left
// correct, codes and numbers in order, no broken characters). Sample data only (lib/email-templates/samples.ts), so nothing
// real leaves the machine. Run from the repo root with RESEND_API_KEY (and EMAIL_FROM on the verified domain) in .env:
//
//   npx --yes tsx@4.23.15 scripts/email-test-send.ts you@gmail.com                 the eight templates x ar, en = 16 emails
//   npx --yes tsx@4.23.15 scripts/email-test-send.ts you@outlook.com --all-variants  every sample the preview offers (28)
//   npx --yes tsx@4.23.15 scripts/email-test-send.ts --dry-run                      renders all of them, sends nothing, no key
//
// Each send has its own idempotency key (one run id per invocation), so rerunning sends a fresh set. Sends are spaced out to
// stay under Resend's default rate limit. Exits 1 if any send fails.
import { existsSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import type { Locale } from "@/lib/format";
import { getTemplate, templateNames } from "@/lib/email-templates";
import { sampleEmailData, templateVariants } from "@/lib/email-templates/samples";
import { sendEmail } from "@/lib/email-templates/send";

const SPACING_MS = 600;

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const allVariants = args.includes("--all-variants");
  const to = args.find((a) => !a.startsWith("--"));
  if (existsSync(".env")) process.loadEnvFile(".env");

  if (!dryRun && !to) {
    console.error("Usage: npx --yes tsx@4.23.15 scripts/email-test-send.ts <address> [--all-variants] | --dry-run");
    return 1;
  }
  if (!dryRun && !process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set (.env or the environment). Nothing was sent.");
    return 1;
  }

  const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const locales: Locale[] = ["ar", "en"];
  const jobs = templateNames.flatMap((name) => {
    const variants = templateVariants[name] as readonly string[];
    const picked = allVariants && variants.length ? variants : [variants[0]];
    return picked.flatMap((variant) => locales.map((locale) => ({ name, variant, locale })));
  });

  let failed = 0;
  for (const [i, job] of jobs.entries()) {
    const label = `${job.name}${job.variant ? `/${job.variant}` : ""} ${job.locale}`;
    const data = sampleEmailData(job.name, job.locale, job.variant);
    const template = getTemplate(job.name);
    const subject = template.subject(job.locale, data);
    if (dryRun) {
      const { html, text } = template.render(job.locale, data);
      console.log(`render  ${label.padEnd(36)} ${String(html.length).padStart(6)} B html  ${String(text.length).padStart(5)} B text  ${subject}`);
      continue;
    }
    const key = `test-send:${runId}:${job.name}:${job.variant ?? "default"}:${job.locale}`;
    const result = await sendEmail(job.name, job.locale, to ?? "", data, { idempotencyKey: key });
    if (result.ok) console.log(`sent    ${label.padEnd(36)} ${result.id}  ${subject}`);
    else {
      failed += 1;
      console.error(`FAILED  ${label.padEnd(36)} ${result.error}`);
    }
    if (i < jobs.length - 1) await sleep(SPACING_MS);
  }
  console.log(dryRun ? `${jobs.length} emails rendered, none sent.` : `${jobs.length - failed} of ${jobs.length} sent to ${to}.`);
  return failed ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
