import { describe, expect, it } from "vitest";
import { compiled as BT24_053 } from "./BT24-053.js";

describe("BT24-053 Protecmon", () => {
  it("has its printed Blocker keyword and Appmon level-2 evolution", () => {
    expect(BT24_053.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Blocker" }],
    });
    expect(BT24_053.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
  });
});
