// axe-core on every route of the route map (docs/screens/PLAYBOOK.md section 2), both locales, at the width of the project
// (phone 390, desktop 1280). Serious and critical violations fail unless they are a recorded defect (support/known-defects.ts,
// ops/known_defects.md); moderate and minor ones are listed, never failed. Every finding is written to
// test-results/e2e/a11y-findings/ and summarised in test-results/e2e/a11y-summary.md after the run (support/findings.ts).
//
// Two limits of axe 4.13, so a clean result is read correctly:
// - Colour contrast skips most Arabic text: its icon-ligature heuristic takes joined Arabic glyphs for an icon font. The colours
//   are the same tokens in both locales, so the English run is the one that measures them.
// - It cannot measure DoctorCard's flip faces. A face turned away (backface-visibility: hidden) is measured as if visible, and
//   the back face's gradient is read as the sand page behind the 3D transform, so white-on-teal text scores about 1.1:1. Those
//   nodes are dropped here (cardFace) and counted in the annotation; ops/known_defects.md asks for an eye check of the back.
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, href, settle, test, widthOf } from "./support/app";
import { writeFindings, type NodeFinding, type RuleFinding } from "./support/findings";
import { LOCALES } from "./support/i18n";
import { knownAxeDefect } from "./support/known-defects";
import { ROUTE_MAP, futureSlot } from "./support/routes";

const BLOCKING = new Set(["serious", "critical"]);

for (const locale of LOCALES) {
  test.describe(`a11y ${locale}`, () => {
    for (const route of ROUTE_MAP) {
      test(`${route.path} (screen ${route.screen})`, async ({ page }, info) => {
        await page.goto(href(locale, route.path.replace("{slot}", futureSlot())));
        await settle(page);

        const results = await new AxeBuilder({ page }).analyze();
        const violations: RuleFinding[] = [];
        let unmeasured = 0;
        for (const v of results.violations) {
          const nodes: NodeFinding[] = [];
          for (const n of v.nodes) {
            const target = n.target.map(String).join(" ");
            if (v.id === "color-contrast" && (await cardFace(page, target))) {
              unmeasured++;
              continue;
            }
            const data = (n.any[0]?.data ?? {}) as { fgColor?: string; bgColor?: string; contrastRatio?: number };
            const known = knownAxeDefect(v.id, route.path, data.fgColor, data.bgColor)?.id;
            nodes.push({ target, html: n.html.slice(0, 200), fg: data.fgColor, bg: data.bgColor, ratio: data.contrastRatio, known });
          }
          if (nodes.length) violations.push({ id: v.id, impact: v.impact ?? "unknown", help: v.help, helpUrl: v.helpUrl, nodes });
        }

        const slug = route.path.replace(/\?.*$/, (q) => q.replace(/slot=\{slot\}&?/, "")).replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "home";
        writeFindings(`${info.project.name}-${locale}-${slug}`, {
          project: info.project.name,
          width: widthOf(page),
          locale,
          path: route.path.replace("slot={slot}&", ""),
          screen: route.screen,
          violations,
        });

        for (const v of violations) {
          const ids = [...new Set(v.nodes.map((n) => n.known).filter(Boolean))].join(", ");
          info.annotations.push({ type: `axe ${v.impact}`, description: `${v.id} x${v.nodes.length}${ids ? ` (${ids})` : ""}: ${v.help}` });
        }
        if (unmeasured) info.annotations.push({ type: "axe not measured", description: `color-contrast x${unmeasured} on a DoctorCard face (see header)` });
        const unknown = violations
          .filter((v) => BLOCKING.has(v.impact))
          .flatMap((v) =>
            v.nodes
              .filter((n) => !n.known)
              .map((n) => `${v.impact} ${v.id}: ${n.target}${n.fg ? ` ${n.fg} on ${n.bg} (${n.ratio}:1)` : ""} ${n.html}`),
          );
        expect(unknown, "serious or critical axe violations that are not a recorded defect").toEqual([]);
      });
    }
  });
}

/**
 * True when axe cannot measure the element: it is on DoctorCard's back face (gradient behind a 3D transform), or on a face
 * turned away from the viewer (an odd number of 180-degree turns above a backface-hidden face).
 */
async function cardFace(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const start = document.querySelector(sel) as HTMLElement | null;
    if (!start) return false;
    if (start.closest('[data-card-face="back"]')) return true;
    let turns = 0;
    let hiddenFace = false;
    for (let el: HTMLElement | null = start; el; el = el.parentElement) {
      if (el.style.transform.includes("rotateY(180deg)")) turns++;
      if (getComputedStyle(el).backfaceVisibility === "hidden") hiddenFace = true;
    }
    return hiddenFace && turns % 2 === 1;
  }, selector);
}
