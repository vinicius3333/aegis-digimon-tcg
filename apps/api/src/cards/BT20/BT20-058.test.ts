import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-058.js";

describe("BT20-058 Raidenmon", () => {
  it("deletes one opposing Digimon with play cost 7 or less on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({ actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 7 }, count: 1 } }] });
    }
  });

  it("replaces battle-area departure with an optional free play from digivolution cards", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({ actions: [{ kind: "Replacement", event: "wouldLeavePlay", sourceFilter: { isSelfRef: true, zone: "battleArea" }, actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true, target: { filter: { controller: "mine", kind: ["Digimon"], playCostLte: 11, nameOrTrait: [{ tokens: ["Cyborg", "Machine"], match: "trait" }] }, count: 1 } }] }] });
  });

  it("requires Raijinmon, Fujinmon, and Suijinmon for DigiXros -2", () => {
    expect(compiled.digiXrosRequirement).toEqual([{ materials: [{ names: ["Raijinmon"] }, { names: ["Fujinmon"] }, { names: ["Suijinmon"] }], cost: 2 }]);
  });
});
