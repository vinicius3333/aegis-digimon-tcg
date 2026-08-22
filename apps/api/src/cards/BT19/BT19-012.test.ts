import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-012 Starmon", () => {
  it("preserves the DigiXros-only Shoutmon alias and all printed effect branches", () => {
    const card = runtimeCompiledCard("BT19-012");
    expect(card).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [
        { names: ["Shoutmon"], cost: 4, isAlternate: true },
        { level: 4, traits: ["Xros Heart"], cost: 3, isAlternate: true },
      ],
    });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Shoutmon"], digiXrosOnly: true }],
      },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "ModifyDP", amount: -3000, duration: "forTheTurn" },
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } }, count: 1 },
          },
        ],
      })),
      {
        trigger: "OnDeletion",
        actions: [{ kind: "PlaceUnder", underFilter: { controllerDefault: "mine", kind: ["Tamer"] } }],
      },
      { trigger: "YourTurn", isInherited: true, actions: [{ kind: "GainKeyword", keyword: { keyword: "Rush" } }] },
    ]);
  });
});
