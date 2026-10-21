// lib/credentials.ts: the B7 board rule and the file-size unit shared by the builder (29) and the review (38).
import { describe, expect, it } from "vitest";
import { business } from "@/config/business";
import { formatNumber } from "@/lib/format";
import { MB, NAMED_BOARD, boardIsNamed, toMb } from "@/lib/credentials";

describe("file sizes in MB", () => {
  it("uses binary megabytes (1 MB = 1,048,576 bytes)", () => {
    expect(MB).toBe(1_048_576);
    expect(toMb(MB)).toBe(1);
    expect(toMb(0)).toBe(0);
  });

  // Screens 29 (builder) and 38 (review) both show toMb(bytes) through formatNumber with one decimal.
  const oneDecimal = (bytes: number) => formatNumber(toMb(bytes), "en", { maximumFractionDigits: 1 });

  it("rounds for display through lib/format, one decimal", () => {
    expect(oneDecimal(1_572_864)).toBe("1.5"); // 1.5 MB exactly
    expect(oneDecimal(2_400_000)).toBe("2.3"); // 2.2888 MB
    expect(oneDecimal(1_100_000)).toBe("1"); // 1.049 MB: no trailing ".0"
    expect(oneDecimal(52_429)).toBe("0.1"); // 0.05 MB rounds half up
    expect(formatNumber(toMb(2_400_000), "ar", { maximumFractionDigits: 1 })).toBe("2.3"); // Western digits (rule N1)
  });

  // KD-013 (ops/known_defects.md): a credential file under 0.05 MB (a small scan or photo) reads "0 MB". Marked as an expected
  // failure, so the day the pages round small sizes up this turns red and the defect line can be closed.
  it.fails("KD-013: a non-empty file never reads 0 MB", () => {
    expect(oneDecimal(40_000)).not.toBe("0");
  });

  it("measures the credential limit in the same unit, so a file of exactly the limit passes and one byte more does not", () => {
    const limit = business.credentialMaxMb;
    expect(toMb(limit * MB) <= limit).toBe(true);
    expect(toMb(limit * MB + 1) <= limit).toBe(false);
    // Display rounding must not hide an over-limit file: 20 MB + 1 byte still reads "20" at one decimal.
    expect(formatNumber(toMb(limit * MB + 1), "en", { maximumFractionDigits: 1 })).toBe(String(limit));
  });
});

describe("rule B7: a certified board is a named ABMS or AOA board", () => {
  it.each(["American Board of Pediatrics", "American Osteopathic Board of Family Physicians", "  american board of internal medicine "])(
    "%j is named",
    (name) => expect(boardIsNamed(name)).toBe(true),
  );

  it.each(["Board eligible", "American Board of", "ABMS", "Royal College of Physicians", "The American Board of Surgery", ""])(
    "%j is not named",
    (name) => expect(boardIsNamed(name)).toBe(false),
  );

  it("is one pattern, case-insensitive", () => {
    expect(NAMED_BOARD.flags).toContain("i");
  });
});
