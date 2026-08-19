import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-046.js";

describe("BT23-046 Rosemon", () => {
  it("declares Fortitude", () => {
    expect((compiled.effects.find((entry) => entry.trigger === "Static") as any).keywords[0].keyword).toBe("Fortitude");
  });

  it("by suspending one of your Digimon/Tamers, restricts one opposing Digimon/Tamer from unsuspending", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Restrict",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
        restriction: "unsuspend",
        duration: "untilOpponentTurnEnd",
        cost: { kind: "suspend", target: { filter: { controller: "mine", kind: ["Digimon", "Tamer"] }, count: 1 } },
        optional: true,
        abortOnDecline: true,
      });
    }
  });

  it("once per opponent turn may redirect an attack to a suspended Vegetation/Plant/Fairy/CS Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OpponentsTurn") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOpponentAttacks",
      actions: [
        {
          kind: "RedirectAttack",
          optional: true,
          target: {
            filter: {
              controller: "mine",
              suspended: true,
              kind: ["Digimon"],
              nameOrTrait: [
                { tokens: ["Vegetation", "Plant", "Fairy"], match: "trait" },
                { tokens: ["CS"], match: "trait" },
              ],
            },
            count: 1,
          },
        },
      ],
    });
  });
});
