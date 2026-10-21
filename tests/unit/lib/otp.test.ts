// lib/otp.ts (rules F6, N1): one code field, paste works, Arabic-Indic and Persian digits count as Western digits.
import { describe, expect, it } from "vitest";
import { business } from "@/config/business";
import { checkCode, codeDigits, prototypeWrongCode } from "@/lib/otp";

const N = business.otpDigits;

describe("codeDigits", () => {
  it("keeps Western digits up to the code length", () => {
    expect(N).toBe(6);
    expect(codeDigits("123456", N)).toBe("123456");
    expect(codeDigits("1234567", N)).toBe("123456");
  });

  it("drops the spaces and dashes of a pasted code", () => {
    expect(codeDigits("123 456", N)).toBe("123456");
    expect(codeDigits("12-34-56", N)).toBe("123456");
    expect(codeDigits(" Your code: 123456. ", N)).toBe("123456");
  });

  it("reads Arabic-Indic and Persian digits as the same Western digits", () => {
    expect(codeDigits("١٢٣٤٥٦", N)).toBe("123456");
    expect(codeDigits("۱۲۳۴۵۶", N)).toBe("123456");
    expect(codeDigits("١٢٣ 4٥6", N)).toBe("123456");
    expect(codeDigits("٠٩٨٧٦٥", N)).toBe("098765");
  });

  it("returns nothing for text with no digits", () => {
    expect(codeDigits("abc", N)).toBe("");
  });
});

describe("checkCode", () => {
  it("names the problem: empty, then short", () => {
    expect(checkCode("", N)).toBe("empty");
    expect(checkCode("12345", N)).toBe("short");
    expect(checkCode("123456", N)).toBeUndefined();
  });

  it("the prototype's wrong code is all zeros of the code length", () => {
    expect(prototypeWrongCode(N)).toBe("000000");
    expect(checkCode(prototypeWrongCode(N), N)).toBeUndefined(); // a full code; the action refuses it as wrong
  });
});
