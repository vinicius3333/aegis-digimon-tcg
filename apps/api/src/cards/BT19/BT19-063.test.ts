import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-063.js";

describe("BT19-063", () => {
  it("preserves Material Save, de-digivolve plus conditional deletion, and Knightmon play branches", () => {
    const card = runtimeCompiledCard("BT19-063");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "MaterialSave", amount: 1 }] },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "DeDigivolve", target: { filter: { controller: "opponent", kind: ["Digimon"] } }, amount: 1 },
          {
            kind: "Delete",
            target: { filter: { kind: ["Digimon", "Tamer"], playCostLte: 3 } },
            condition: { kind: "digiXrosCount", minimum: 2 },
            optional: true,
          },
        ],
      })),
      { trigger: "OnDeletion", actions: [{ kind: "PlayWithoutCost", from: ["underMyTamers"], optional: true }] },
      {
        trigger: "OnDeletion",
        isInherited: true,
        actions: [{ kind: "PlayWithoutCost", from: ["trash"], optional: true }],
      },
    ]);
  });
});
