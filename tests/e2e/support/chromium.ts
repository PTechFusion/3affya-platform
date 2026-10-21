// Which Chromium the suite drives. CI installs the build the pinned @playwright/test expects (`npx playwright install
// chromium`), so nothing is overridden there. A machine that has an older Playwright Chromium but not this version's build uses
// the newest one it has, as scripts/screenshots.mjs does, instead of downloading. CHROME_PATH wins over both.
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

// Headless shell first (what Playwright itself runs headless), then the full browser; per platform folder names.
const CANDIDATES: Array<[prefix: string, relative: string[]]> = [
  [
    "chromium_headless_shell-",
    [
      join("chrome-headless-shell-win64", "chrome-headless-shell.exe"),
      join("chrome-headless-shell-linux64", "chrome-headless-shell"),
      join("chrome-headless-shell-mac-arm64", "chrome-headless-shell"),
      join("chrome-headless-shell-mac-x64", "chrome-headless-shell"),
    ],
  ],
  [
    "chromium-",
    [
      join("chrome-win64", "chrome.exe"),
      join("chrome-linux64", "chrome"),
      join("chrome-linux", "chrome"),
      join("chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
    ],
  ],
];

function browserRoots(): string[] {
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "ms-playwright") : undefined,
    join(homedir(), ".cache", "ms-playwright"),
    join(homedir(), "Library", "Caches", "ms-playwright"),
  ];
  return roots.filter((r): r is string => Boolean(r) && existsSync(r!));
}

const buildOf = (dir: string) => Number(dir.split("-").pop()) || 0;

/** An executable path to launch with, or undefined to let Playwright use its own pinned build. */
export function chromiumExecutable(): string | undefined {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  try {
    if (existsSync(chromium.executablePath())) return undefined;
  } catch {
    /* no pinned build registered: look for any installed one */
  }
  for (const [prefix, relatives] of CANDIDATES) {
    for (const root of browserRoots()) {
      const dirs = readdirSync(root)
        .filter((d) => d.startsWith(prefix))
        .sort((a, b) => buildOf(b) - buildOf(a));
      for (const dir of dirs) {
        for (const rel of relatives) {
          const bin = join(root, dir, rel);
          if (existsSync(bin)) return bin;
        }
      }
    }
  }
  return undefined;
}
