import { describe, expect, it } from "vitest";
import { compiled as BT25_009 } from "./BT25-009.js";
import "../index.js";

describe("BT25-009 Bearmon", () => {
  it("offers the free hand digivolution only at 4 or less memory", () => {
    const effect = BT25_009.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: false,
      optional: true,
      condition: { kind: "memoryAtMost", value: 4 },
      into: {
        controllerDefault: "mine",
        kind: ["Digimon"],
        excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
      },
    });
  });

  it("preserves inherited +1000 DP", () => {
    expect(BT25_009.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] });
  });
});
