import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-002.js";

describe("BT20-002 Bebydomon", () => {
  it("proves the inherited once-per-turn draw gate checks Dracomon or Examon text", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    const action = effect?.actions[0];

    expect(effect).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
    expect(action).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      condition: {
        kind: "selfTopHasText",
        filter: { nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }] },
      },
    });
  });
});
