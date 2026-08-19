import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-059.js";

describe("BT23-059 Justimon: Blitz Arm", () => {
  it("has Blocker", () => {
    expect((compiled.effects.find((entry) => entry.trigger === "Static") as any).keywords[0].keyword).toBe("Blocker");
  });

  it("mandatorily trashes any Option in the battle area to delete the opponent's lowest-play-cost Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger) as any;
      const action = effect.actions[0];
      expect(effect.frequency).toBe("OncePerTurn");
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", superlative: "lowestPlayCost" }, count: 1 },
        cost: { kind: "trash", target: { filter: { zone: "battleArea", kind: ["Option"] }, count: 1 } },
        abortOnDecline: true,
      });
      expect(action.optional).toBeUndefined();
    }
  });

  it("once per turn unsuspends and protects itself when an Option in the battle area is trashed", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOptionInBattleAreaTrashed",
      actions: [
        { kind: "Unsuspend", target: { filter: { isSelfRef: true }, isSelf: true } },
        { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", duration: "forTheTurn" },
      ],
    });
  });
});
