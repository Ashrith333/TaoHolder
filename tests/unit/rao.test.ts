import { describe, expect, it } from "vitest";
import { parseTao, pctOf, raoToInput, raoToTao, taoToRao } from "@/services/rao";
import { formatChange, formatTao, shortAddress, currencyPair, fill } from "@/services/format";

describe("rao", () => {
  it("parses decimals exactly and rounds down", () => {
    expect(parseTao("50")).toBe(50_000_000_000n);
    expect(parseTao("0.0400")).toBe(40_000_000n);
    expect(parseTao("1.1234567899")).toBe(1_123_456_789n);
    expect(parseTao("abc")).toBeNull();
    expect(parseTao("")).toBeNull();
  });
  it("round trips", () => {
    expect(raoToTao(taoToRao(12.5))).toBe(12.5);
    expect(raoToInput(parseTao("12.40")!)).toBe("12.4");
  });
  it("pctOf floors", () => {
    expect(pctOf(parseTao("50")!, 30)).toBe(15_000_000_000n);
  });
});

describe("format", () => {
  it("formats TAO per PRD 8.5", () => {
    expect(formatTao(1412.6)).toBe("1,412.60 TAO");
    expect(formatTao(0.04)).toBe("0.0400 TAO");
  });
  it("sign and arrow on change", () => {
    expect(formatChange(6.1).text).toBe("▲ +6.1%");
    expect(formatChange(-1.8).text).toBe("▼ -1.8%");
  });
  it("short address and currency order", () => {
    expect(shortAddress("5FhAxxxxxxxxxx9xQe")).toBe("5FhA…9xQe");
    expect(currencyPair(10, 2, "usd").primary).toBe("$20.00");
    expect(fill("{x} TAO left of {total}", { x: 1, total: 2 })).toBe("1 TAO left of 2");
  });
});
