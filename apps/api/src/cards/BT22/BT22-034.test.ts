import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-034.js";

describe("BT22-034 Reppamon", () => {
  it("models the instead choice as -6000 with the security cost or -3000 without stacking", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDiscardSecurity",
        actions: [
          {
            kind: "PlayWithoutCost",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            payCost: false,
            optional: true,
          },
        ],
      }),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Modal",
        choose: 1,
        options: [
          [
            {
              kind: "ModifyDP",
              amount: -6000,
              duration: "untilOpponentTurnEnd",
              cost: { kind: "trashSecurityTop" },
              optional: true,
              abortOnDecline: true,
            },
          ],
          [{ kind: "ModifyDP", amount: -3000, duration: "untilOpponentTurnEnd" }],
        ],
      });
    }
    const inherited = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(inherited).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
    });
  });
});
