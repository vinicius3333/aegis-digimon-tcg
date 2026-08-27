import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT2-111.js";
import "./BT2-112.js";

const card = (cardId: string) => runtimeCompiledCard(cardId);

describe("BT2-111 through BT2-112 IR coverage", () => {
  it("registers both cards with complete executable coverage", () => {
    for (const cardId of ["BT2-111", "BT2-112"]) {
      expect(card(cardId), `${cardId} must register compiled IR`).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("preserves each card's live-state gates and target bindings", () => {
    expect(card("BT2-111")?.effects).toMatchObject([
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "Digivolve",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                zone: "battleArea",
                nameOrTrait: [{ tokens: ["Impmon"], match: "nameExact" }],
              },
              count: 1,
            },
            into: { controllerDefault: "mine", isSelfRef: true },
            from: ["hand"],
            payCost: true,
            costOverride: 4,
            ignoreRequirements: true,
            condition: {
              kind: "selfHasMinTrash",
              count: 10,
              filter: { controllerDefault: "mine" },
            },
          },
        ],
      },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
              count: 1,
            },
          },
        ],
      },
    ]);

    expect(card("BT2-112")?.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [
          {
            kind: "Replacement",
            event: "wouldBePlayed",
            mode: "reduceCost",
            amount: 6,
            condition: {
              kind: "opponentHas",
              filter: {
                zone: "battleArea",
                controllerDefault: "opponent",
                kind: ["Digimon"],
                dp: { op: "gte", value: 10000 },
              },
            },
          },
        ],
      },
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "Unsuspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            condition: {
              kind: "attackTargetMatchesFilter",
              filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" },
            },
          },
        ],
      },
    ]);
  });
});
