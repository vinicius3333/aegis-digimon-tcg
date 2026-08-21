import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-063 DarkKnightmon", () => {
  it("preserves Material Save, DigiXros-gated deletion, and both Knightmon play paths", () => {
    const card = runtimeCompiledCard("BT19-063");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.digiXrosRequirement).toEqual([
      { materials: [{ names: ["SkullKnightmon"] }, { names: ["DeadlyAxemon"] }], count: 2, costModifier: -2 },
    ]);
    expect(card?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "MaterialSave", amount: 1, raw: "＜Material Save 1＞" }] },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "DeDigivolve", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: 1 },
          { kind: "Delete", target: { filter: { controller: "any", kind: ["Digimon", "Tamer"], playCostLte: 3 }, count: 1 }, condition: { kind: "digiXrosCount", minimum: 2 }, optional: true },
        ],
      })),
      { trigger: "OnDeletion", actions: [{ kind: "PlayWithoutCost", from: ["underMyTamers"], payCost: false, optional: true }] },
      { trigger: "OnDeletion", isInherited: true, actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }] },
    ]);
  });
});
