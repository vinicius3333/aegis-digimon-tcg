import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-070.js";

describe("BT20-070 Loogarmon", () => {
  it("optionally trashes one hand card to return one SoC/SEEKERS card from trash on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{ kind: "Return", to: "hand", optional: true, abortOnDecline: true, cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } }, target: { filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["SoC", "SEEKERS"], match: "trait" }] }, count: 1 } }] });
    }
  });

  it("grants inherited +2000 DP during its controller's turn", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }] });
  });
});
