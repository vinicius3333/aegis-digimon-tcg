import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-042.js";

describe("BT20-042 Groundramon", () => {
  it("suspends and prevents unsuspending one opponent Digimon or Tamer on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 } },
          { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 } },
        ],
      });
    }
  });

  it("is an Examon DNA-digivolution alias only in the battle area", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [{ kind: "GrantStatic", target: { filter: { isSelfRef: true, zone: "battleArea" }, isSelf: true }, grant: "name", tokens: ["Breakdramon", "Examon"] }],
    });
  });

  it("trashes the opponent's top security when this battle-area Digimon deletes in battle", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", sourceFilter: { isSelfRef: true, zone: "battleArea" }, actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }] }],
    });
  });
});
