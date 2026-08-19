import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-002.js";

describe("BT23-002 Yokomon", () => {
  it("draws once per turn when attacking if this Digimon has CS", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    const action = effect?.actions[0];

    expect(effect).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      isInherited: true,
    });
    expect(action).toMatchObject({ kind: "Draw", controller: "mine", amount: 1 });
    expect(action?.condition).toEqual({
      kind: "selfHasTrait",
      filter: { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
      raw: "this Digimon has the [CS] trait",
    });
  });
});
