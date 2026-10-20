// Vitest global setup for the RLS suite: resolve the stack once, check it answers, and hand the URL and keys to the test
// files. Throwing here fails the whole run with one clear message instead of every test failing on its own.
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";
import { assertStackReachable, resolveStackEnv } from "./env";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

export default async function setup(project: TestProject): Promise<void> {
  const env = resolveStackEnv(repoRoot);
  await assertStackReachable(env);
  project.provide("rlsStack", env);
}
