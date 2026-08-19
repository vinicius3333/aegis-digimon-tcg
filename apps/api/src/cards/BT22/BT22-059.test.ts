import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-059.js";

describe("BT22-059 Infermon", () => {
  it("deletes an opposing play-cost-5-or-lower Digimon and grants conditional protection", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 5 }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "GrantStatic",
        grant: "immuneToOpponentDPReductionAndReturn",
        duration: "untilOpponentTurnEnd",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        condition: {
          kind: "youHave",
          filter: { nameOrTrait: [{ tokens: ["Arata Sanada", "Eater Adam"], match: "name" }] },
        },
      });
    }
  });

  it("plays one Diaboromon token when an own Unidentified Digimon is deleted", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Unidentified"], match: "trait" }],
          },
          actions: [{ kind: "PlayToken", tokens: ["Diaboromon"], count: 1, payCost: false, optional: true }],
        },
      ],
    });
  });
});
