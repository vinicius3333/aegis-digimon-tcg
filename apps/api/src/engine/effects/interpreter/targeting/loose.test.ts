import { describe, expect, it } from "vitest";
import type { EffectContext } from "../../EffectContext.js";
import { pickLoose, type LooseCandidate } from "./loose.js";
import type { CardDefinition, Target } from "@aegis/shared";

function candidate(instanceId: string, cardId: string): LooseCandidate {
  return { instanceId, cardId, ownerSeat: 0 };
}

function context(definitions: Record<string, number>): EffectContext {
  const source = { ownerSeat: 0, instanceId: "SOURCE" };
  return {
    source,
    game: {
      definitionOf: (card: { cardId: string }) =>
        ({
          cardId: card.cardId,
          nameEn: card.cardId,
          playCost: definitions[card.cardId],
          level: card.cardId === "A" ? 3 : 4,
          kinds: ["Digimon"],
        }) as CardDefinition,
    },
    ask: {
      selectCards: async (_ctx: EffectContext, options: { candidates: string[] }) => options.candidates,
    },
  } as unknown as EffectContext;
}

describe("pickLoose aggregate play-cost budgets", () => {
  it.each([
    ["distinct names", { filter: { distinctNames: true }, count: 2, upTo: true }, ["A", "B"]],
    ["distinct card numbers", { distinctCardNumbers: true, count: 2, upTo: true }, ["A", "B"]],
    ["distinct levels", { distinctLevels: true, count: 2, upTo: true }, ["A", "B"]],
  ] as const)("keeps %s selections within the combined cap", async (_label, shape, expected) => {
    const ctx = context({ A: 4, B: 3 });
    const candidates = [candidate("A", "A"), candidate("B", "B")];
    const target = { ...shape, filter: { ...shape.filter }, totalPlayCostBudget: 5 } as Target;

    await expect(pickLoose(ctx, target, candidates)).resolves.toEqual(expected.slice(0, 1).map((id) => id));
  });

  it("requires every exact name while rejecting a set that exceeds the cap", async () => {
    const ctx = context({ A: 3, B: 3 });
    const target = {
      filter: {},
      count: 2,
      requiredNamesExact: ["A", "B"],
      totalPlayCostBudget: 5,
    } as Target;

    await expect(pickLoose(ctx, target, [candidate("A", "A"), candidate("B", "B")])).resolves.toEqual([]);
  });
});
