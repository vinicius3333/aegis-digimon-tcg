import { describe, expect, it } from "vitest";
import { sharedCardNumber, sharedCardNumberCount, sharedCardNumberGroups } from "./sharedCardNumbers.js";

describe("sharedCardNumber", () => {
  it("maps RB1 reprints onto the promo number they are treated as", () => {
    expect(sharedCardNumber("RB1-004")).toBe("P-009");
    expect(sharedCardNumber("RB1-006")).toBe("P-058");
    expect(sharedCardNumber("RB1-007")).toBe("P-010");
  });

  it("leaves cards without the rule as their own number", () => {
    expect(sharedCardNumber("P-009")).toBe("P-009");
    expect(sharedCardNumber("BT1-010")).toBe("BT1-010");
    expect(sharedCardNumber("UNKNOWN-000")).toBe("UNKNOWN-000");
  });
});

describe("sharedCardNumberCount", () => {
  it("adds copies across every printing that shares the number", () => {
    const list = ["RB1-004", "RB1-004", "P-009", "BT1-010"];
    expect(sharedCardNumberCount(list, "RB1-004")).toBe(3);
    expect(sharedCardNumberCount(list, "P-009")).toBe(3);
    expect(sharedCardNumberCount(list, "BT1-010")).toBe(1);
  });
});

describe("sharedCardNumberGroups", () => {
  it("groups distinct printings under the shared number", () => {
    const groups = sharedCardNumberGroups(["RB1-004", "P-009", "RB1-004", "BT1-010"]);
    expect(groups.get("P-009")).toEqual(["RB1-004", "P-009"]);
    expect(groups.get("BT1-010")).toEqual(["BT1-010"]);
  });
});
