import { describe, expect, it } from "vitest";
import { compiled as BT25_061 } from "./BT25-061.js";
import "../index.js";

describe("BT25-061 Dokimon", () => {
  it("trashes an Appmon card to draw and gain memory at main-phase start", () => {
    const effect = BT25_061.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      cost: {
        kind: "trash",
        target: {
          filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
          count: 1,
        },
      },
      abortOnDecline: true,
    });
    expect(effect?.actions?.[1]).toMatchObject({ kind: "GainMemory", amount: 1 });
  });
});
