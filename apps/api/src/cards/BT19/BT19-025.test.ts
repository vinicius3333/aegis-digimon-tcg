import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-025 Greymon", () => {
  it("preserves Material Save, Rush, de-digivolution, and under-Tamer Blue Flare play paths", () => {
    const card = runtimeCompiledCard("BT19-025");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "MaterialSave", amount: 2 }] },
      { trigger: "OnPlay", actions: [{ kind: "GainKeyword", keyword: { keyword: "Rush" }, duration: "forTheTurn" }] },
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "DeDigivolve",
            amount: 1,
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          },
          {
            kind: "Digivolve",
            from: ["digivolutionCardsUnderTamers"],
            payCost: false,
            optional: true,
            into: { nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }] },
          },
        ],
      },
      {
        trigger: "EndOfAttack",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCardsUnderTamers"], payCost: false, optional: true }],
      },
    ]);
  });
});
