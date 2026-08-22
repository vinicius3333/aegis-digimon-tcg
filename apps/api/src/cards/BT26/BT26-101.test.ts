import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-101.js";
import "../index.js";

describe("BT26-101 compiled fidelity", () => {
  it("preserves the TS waiver, conditional grant, modal, and Security play with the DP seam explicit", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: { filter: { playCostLte: 4, nameOrTrait: [{ tokens: ["TS"], match: "trait" }] } },
        },
      ],
    });
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "Blocker" } },
      { kind: "ModifyDP", amount: 3000 },
      { kind: "Modal", choose: 1, options: [[{ kind: "SelectBind" }, { kind: "Delete" }], [{ kind: "Unsuspend" }]] },
    ]);
  });
});
