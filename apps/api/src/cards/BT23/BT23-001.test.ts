import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-001.js";

describe("BT23-001 Flickmon", () => {
  it("draws once per turn when attacking if this Digimon has Appmon", () => {
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
      filter: { nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
      raw: "this Digimon has the [Appmon] trait",
    });
  });
});
