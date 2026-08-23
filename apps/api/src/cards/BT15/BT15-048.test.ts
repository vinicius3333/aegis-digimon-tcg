import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-048.js";

describe("BT15-048", () => {
  it("restricts unsuspension and conditionally suspends an opposing Digimon when Togemon/X Antibody is in stack", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "unsuspend",
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "Suspend",
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: {
          nameOrTrait: [
            { tokens: ["Togemon"], match: "name" },
            { tokens: ["X Antibody"], match: "trait" },
          ],
        },
      },
    });
  });
  it("gains +1000 DP per suspended opposing Digimon as an inherited effect", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, scaling: { per: 1, unit: "cards" } }],
    }));
});
