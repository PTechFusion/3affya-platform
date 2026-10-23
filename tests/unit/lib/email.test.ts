// lib/email.ts: the one email check every form uses (rules F4, F5). Each problem has its own code so the page can name the fix.
import { describe, expect, it } from "vitest";
import { checkEmail, type EmailProblem } from "@/lib/email";

describe("checkEmail", () => {
  it.each<[string, EmailProblem]>([
    ["", "empty"],
    ["   ", "empty"],
    ["noura @example.com", "spaces"],
    ["noura@exa mple.com", "spaces"],
    ["noura.example.com", "noAt"],
    ["noura@@example.com", "manyAt"],
    ["a@b@example.com", "manyAt"],
    ["@example.com", "noName"],
    ["noura@", "noDomain"],
    ["noura@example", "noDot"],
    ["noura@example.", "noDot"],
    ["noura@.example.com", "noDot"],
    ["noura@example..com", "noDot"],
  ])("%j is %s", (raw, problem) => {
    expect(checkEmail(raw)).toBe(problem);
  });

  it.each(["noura@example.com", "  noura@example.com  ", "dr.omar+3affya@clinic.example.co.uk", "n@e.sa"])("%j passes", (raw) => {
    expect(checkEmail(raw)).toBeUndefined();
  });

  it("checks in the order a person fixes things: empty, then spaces, then the @", () => {
    expect(checkEmail(" a b ")).toBe("spaces");
    expect(checkEmail("a b@@c")).toBe("spaces");
  });
});
