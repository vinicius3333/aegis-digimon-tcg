import { CardColor, CardKind, type AssemblyRequirement, type CardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assemblyPossible, eligibleAssemblyCandidateIds } from "./assemblyMaterialSelection";

function card(cardId: string, nameEn: string, options: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: "TEST",
    nameEn,
    kinds: [CardKind.Digimon],
    colors: [CardColor.Black],
    playCost: 4,
    dp: 4000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...options,
  };
}

const twoPlutomon: AssemblyRequirement = { materials: [{ namesExact: ["Plutomon"], count: 2 }], reduceCost: 4 };

describe("eligibleAssemblyCandidateIds", () => {
  it("offers only trash cards that fit the recipe slot", () => {
    const candidates = [
      { instanceId: "a", definition: card("BT13-084", "Plutomon") },
      { instanceId: "b", definition: card("BT13-084", "Plutomon") },
      { instanceId: "c", definition: card("BT1-001", "Yokomon") },
    ];
    expect([...eligibleAssemblyCandidateIds(twoPlutomon, candidates, [])].sort()).toEqual(["a", "b"]);
  });

  it("stops offering more cards once the exact count is picked", () => {
    const candidates = [
      { instanceId: "a", definition: card("BT13-084", "Plutomon") },
      { instanceId: "b", definition: card("BT13-084", "Plutomon") },
      { instanceId: "c", definition: card("BT13-084", "Plutomon") },
    ];
    expect([...eligibleAssemblyCandidateIds(twoPlutomon, candidates, ["a", "b"])].sort()).toEqual(["a", "b"]);
  });

  it("enforces different levels across the selection", () => {
    const requirement: AssemblyRequirement = {
      materials: [{ traits: ["Dragonkin"], count: 2, differentLevels: true }],
      reduceCost: 3,
    };
    const candidates = [
      { instanceId: "a", definition: card("X-1", "A", { level: 3, types: ["Dragonkin"] }) },
      { instanceId: "b", definition: card("X-2", "B", { level: 3, types: ["Dragonkin"] }) },
      { instanceId: "c", definition: card("X-3", "C", { level: 4, types: ["Dragonkin"] }) },
    ];
    expect([...eligibleAssemblyCandidateIds(requirement, candidates, ["a"])].sort()).toEqual(["a", "c"]);
  });

  it("matches a name-or-trait disjunction", () => {
    const requirement: AssemblyRequirement = {
      materials: [
        {
          nameOrTrait: [
            { tokens: ["Agumon"], match: "name" },
            { tokens: ["TS"], match: "trait" },
          ],
          count: 1,
        },
      ],
      reduceCost: 2,
    };
    const candidates = [
      { instanceId: "a", definition: card("X-1", "Agumon X") },
      { instanceId: "b", definition: card("X-2", "Shota", { kinds: [CardKind.Tamer], types: ["TS"] }) },
      { instanceId: "c", definition: card("X-3", "Yokomon") },
    ];
    expect([...eligibleAssemblyCandidateIds(requirement, candidates, [])].sort()).toEqual(["a", "b"]);
  });
});

describe("assemblyPossible", () => {
  it("requires the trash to hold the full material count", () => {
    const one = [{ instanceId: "a", definition: card("BT13-084", "Plutomon") }];
    expect(assemblyPossible(twoPlutomon, one)).toBe(false);
    expect(assemblyPossible(twoPlutomon, [...one, { instanceId: "b", definition: card("BT13-084", "Plutomon") }])).toBe(
      true,
    );
  });
});
