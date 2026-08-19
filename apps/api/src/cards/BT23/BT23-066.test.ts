import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-066.js";

describe("BT23-066 Matadormon", () => {
  it("declares Scapegoat", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")?.keywords?.[0]?.keyword).toBe("Scapegoat");
  });

  it("deletes one opposing level 4 or lower Digimon on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } }, count: 1 },
      });
    }
  });

  it("only plays an Undead or CS card from trash when the digivolution came from trash", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[1];
      expect(action).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["trash"],
        payCost: false,
        optional: true,
        condition: { kind: "digivolvedFromZone", zone: "trash" },
        target: { filter: { playCostLte: 3, nameOrTrait: [{ tokens: ["Undead", "CS"], match: "trait" }] } },
      });
    }
  });

  it("prevents another of your Digimon from leaving play once per turn by deleting this Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Replacement", event: "wouldLeavePlay" }],
    });
    expect(effect.actions[0].actions[0]).toMatchObject({
      kind: "Prevent",
      mode: "leavePlay",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, isSelf: true } },
    });
  });
});
