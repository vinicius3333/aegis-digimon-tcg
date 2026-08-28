import { describe, expect, it } from "vitest";
import { compiled as BT25_021 } from "./BT25-021.js";
import "../index.js";

describe("BT25-021 Gaomon", () => {
  it("reveals three and adds the two printed search pools", () => {
    const effect = BT25_021.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    const revealAdd = effect?.actions?.[0] as { add?: unknown } | undefined;
    expect(revealAdd?.add).toEqual([
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: {
          controllerDefault: "mine",
          nameOrTrait: [
            { tokens: ["Thomas H. Norstein"], match: "trait" },
            { tokens: ["DATA SQUAD"], match: "trait" },
          ],
        },
      }),
      expect.objectContaining({
        count: 1,
        to: "hand",
        filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Gaogamon"], match: "name" }] },
      }),
    ]);
  });

  it("draws one for both players once per turn when attacking", () => {
    const effect = BT25_021.effects?.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(effect?.actions).toEqual([
      { kind: "Draw", amount: 1, controller: "mine" },
      { kind: "Draw", amount: 1, controller: "opponent" },
    ]);
  });
});
