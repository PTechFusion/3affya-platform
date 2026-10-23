// lib/audit.ts: the audit log's vocabulary (screen 47). Every action belongs to exactly one area, and every action, area and
// target has its copy under adminAudit.* in both languages, so no row ever renders a raw key.
import { describe, expect, it } from "vitest";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import { ALL_AUDIT_ACTIONS, AUDIT_ACTIONS, AUDIT_AREAS, AUDIT_ENUM_KINDS, AUDIT_TARGETS, areaOf, auditCheckPassed } from "@/lib/audit";

type Tree = { [key: string]: Tree | string };
const lookup = (messages: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((node, key) => (node && typeof node === "object" ? (node as Tree)[key] : undefined), messages);

describe("vocabulary", () => {
  it("lists every action once", () => {
    expect(new Set(ALL_AUDIT_ACTIONS).size).toBe(ALL_AUDIT_ACTIONS.length);
    expect(ALL_AUDIT_ACTIONS.length).toBe(AUDIT_AREAS.reduce((n, a) => n + AUDIT_ACTIONS[a].length, 0));
  });

  it("finds each action's own area", () => {
    for (const area of AUDIT_AREAS) for (const action of AUDIT_ACTIONS[area]) expect(areaOf(action)).toBe(area);
    expect(areaOf("payment.succeeded")).toBe("money");
    expect(areaOf("admin.signedIn")).toBe("security");
  });

  it("names actions as <thing>.<pastTense>", () => {
    for (const action of ALL_AUDIT_ACTIONS) expect(action).toMatch(/^[a-z][A-Za-z]*\.[a-z][A-Za-z]*$/);
  });

  it("passes every check result except notConfirmed", () => {
    expect(auditCheckPassed("active")).toBe(true);
    expect(auditCheckPassed("certified")).toBe(true);
    expect(auditCheckPassed("noneFound")).toBe(true);
    expect(auditCheckPassed("notConfirmed")).toBe(false);
  });
});

describe.each([
  ["en", en],
  ["ar", ar],
])("copy in %s", (_locale, messages) => {
  it("has a label for every action", () => {
    for (const action of ALL_AUDIT_ACTIONS) expect(typeof lookup(messages, `adminAudit.actions.${action}`), action).toBe("string");
  });

  it("has a label for every area and every target type", () => {
    for (const area of AUDIT_AREAS) expect(typeof lookup(messages, `adminAudit.areas.${area}`), area).toBe("string");
    for (const target of AUDIT_TARGETS) expect(typeof lookup(messages, `adminAudit.targets.${target}`), target).toBe("string");
  });

  it("has a values group for every enum kind", () => {
    for (const kind of AUDIT_ENUM_KINDS) expect(typeof lookup(messages, `adminAudit.values.${kind}`), kind).toBe("object");
  });
});
