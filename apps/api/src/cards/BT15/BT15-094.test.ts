import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-094.js";

describe("BT15-094", () => {
  it("suspends any level 6 or lower Digimon and gives an Insectoid +3000 DP", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { levelComparison: { op: "lte", value: 6 } } },
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "ModifyDP",
      amount: 3000,
      duration: "untilOpponentTurnEnd",
      target: { filter: { nameOrTrait: [{ tokens: ["Insectoid"], match: "trait" }] } },
    });
  });
  it("activates main and returns itself from security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }, { kind: "AddToHandSelf" }],
    }));
});
