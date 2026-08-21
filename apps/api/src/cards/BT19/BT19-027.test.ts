import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-027 Jellymon", () => {
  it("preserves Decode, Blue stack play, bound-level deck return, and Aquatic rule trait", () => {
    const card = runtimeCompiledCard("BT19-027");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Decode" }] },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["digivolutionCards"],
            payCost: false,
            optional: true,
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                colors: ["Blue"],
                levelComparison: { op: "lte", value: 4 },
              },
            },
          },
        ],
      },
      {
        trigger: "EndOfYourTurn",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Return",
            to: "deckBottom",
            optional: false,
            cost: { kind: "return", to: "deckBottom", storeAs: "returnedDigimonLevel" },
            target: { filter: { controller: "opponent", kind: ["Digimon"], levelLte: "returnedDigimonLevel" } },
          },
        ],
      },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] }] },
    ]);
  });
});
