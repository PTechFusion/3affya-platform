// The rules lib/ai keeps by construction, checked on the source: no model SDK outside lib/ai (CLAUDE.md), each SDK in its own
// adapter only, nothing ADR-3's BAA excludes (Batch API, Files API, prompt caching) and no tool definitions (ADR-4), and no
// model id written in code (it is configuration: AI_MODEL).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { repoPath } from "./support";

const ROOT = repoPath("");
const SKIP = new Set(["node_modules", ".next", ".git", ".claude", ".netlify", "out", "output", "public", "docs"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|mjs|js)$/.test(name) ? [path] : [];
  });
}

const rel = (path: string) => relative(ROOT, path).split(sep).join("/");
const files = sourceFiles(ROOT).map((path) => ({ path: rel(path), text: readFileSync(path, "utf8") }));

/** The source without comments, so a comment that names what is absent does not count as using it. */
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const importsOf = (pkg: string) => new RegExp(`(from\\s+|import\\s*\\(\\s*|require\\s*\\(\\s*)["']${pkg.replace("/", "\\/")}`);

describe("lib/ai's boundaries", () => {
  it("imports @anthropic-ai/sdk only in lib/ai/vendors/anthropic.ts", () => {
    expect(files.filter((f) => importsOf("@anthropic-ai/sdk").test(f.text)).map((f) => f.path)).toEqual(["lib/ai/vendors/anthropic.ts"]);
  });

  it("imports @aws-sdk/client-bedrock-runtime only in lib/ai/vendors/bedrock.ts", () => {
    expect(files.filter((f) => importsOf("@aws-sdk/client-bedrock-runtime").test(f.text)).map((f) => f.path)).toEqual([
      "lib/ai/vendors/bedrock.ts",
    ]);
  });

  it("defines no tools and uses nothing the BAA excludes (Batch API, Files API, prompt caching)", () => {
    const lib = files.filter((f) => f.path.startsWith("lib/ai/"));
    expect(lib.length).toBeGreaterThanOrEqual(10);
    const banned = [/\btools\s*:/, /tool_choice/, /cache_control/, /\.batches\b/, /\.files\b/, /\bbetas\s*:/, /\.beta\./];
    for (const file of lib) for (const pattern of banned) expect(code(file.text), `${file.path} matches ${pattern}`).not.toMatch(pattern);
  });

  it("writes no Claude model id in code: the model is AI_MODEL", () => {
    const pattern = /claude-(opus|sonnet|haiku|fable|mythos)-\d/;
    const offenders = files.filter((f) => !f.path.startsWith("tests/") && f.path !== "config/business.ts" && pattern.test(f.text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });
});
