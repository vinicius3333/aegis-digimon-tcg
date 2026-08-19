import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-055.js";

describe("BT23-055 Cyberdramon", () => {
  it("deletes one opposing Digimon with play cost 5 or less on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", playCostLte: 5 }, count: 1 },
      });
    }
  });

  it("once per turn prevents its own departure by trashing an effect-played Option in the battle area", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited) as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      sourceFilter: { isSelfRef: true },
      cost: {
        kind: "trash",
        target: {
          filter: { zone: "battleArea", controller: "mine", kind: ["Option"], placedInBattleAreaByEffect: true },
          count: 1,
        },
      },
    });
  });

  it("preserves the inherited Cyberdramon/Justimon/CS protection replacement", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.isInherited) as any;
    expect(effect).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { controllerDefault: "mine", kind: ["Digimon"] },
        },
      ],
    });
  });
});
