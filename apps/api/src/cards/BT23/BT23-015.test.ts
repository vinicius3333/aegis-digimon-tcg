import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-015.js";

describe("BT23-015 Phoenixmon", () => {
  it("reduces its play cost with a Zaxon Tamer", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "Replacement", mode: "reduceCost", amount: 5, condition: { kind: "youHave" } }],
    });
  });

  it("shares one Once Per Turn delete/return sequence across all three timings", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger) as any;
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
      expect(effect.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 9000 } }, count: 1 },
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "Return",
        target: {
          filter: { zone: "trash", controller: "opponent", kind: ["Digimon", "Tamer", "Option"] },
          count: 3,
          upTo: true,
        },
        to: "deckBottom",
        optional: true,
      });
    }
  });

  it("places itself face up at the bottom of security on deletion", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "OnDeletion") as any).actions[0];
    expect(action).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      controller: "mine",
      toTop: false,
      faceUp: true,
      source: { filter: { isSelfRef: true }, isSelf: true },
    });
  });
});
