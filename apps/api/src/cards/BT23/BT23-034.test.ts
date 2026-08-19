import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-034.js";

describe("BT23-034 Sakuyamon", () => {
  it("reduces its play cost by 5 when you have a Zaxon Tamer", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 5,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Zaxon"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("once per turn restricts and weakens one opposing Digimon across all three timings", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger) as any;
      expect(effect.frequency).toBe("OncePerTurn");
      expect(effect.sharedUseKey).toBe("ir-shared-0");
      expect(effect.actions).toMatchObject([
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "cannotActivateWhenDigivolving",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
          amount: -6000,
          duration: "untilOpponentTurnEnd",
        },
      ]);
    }
  });

  it("places itself face up at the bottom of security on deletion", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "OnDeletion") as any).actions[0];
    expect(action).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      controller: "mine",
      source: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      toTop: false,
      faceUp: true,
    });
  });
});
