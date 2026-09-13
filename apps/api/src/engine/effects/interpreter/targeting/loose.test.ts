import { describe, expect, it } from "vitest";
import type { EffectContext } from "../../EffectContext.js";
import { pickLoose, type LooseCandidate } from "./loose.js";
import type { CardDefinition, Target } from "@aegis/shared";

function candidate(instanceId: string, cardId: string): LooseCandidate {
  return { instanceId, cardId, ownerSeat: 0 };
}

function context(definitions: Record<string, number>, promptBudgets: number[] = []): EffectContext {
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
      selectCards: async (_ctx: EffectContext, options: { candidates: string[]; maxTotalPlayCost?: number }) => {
        if (options.maxTotalPlayCost !== undefined) promptBudgets.push(options.maxTotalPlayCost);
        return options.candidates;
      },
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

  it("publishes the remaining cap to sequential exact-name and level prompts", async () => {
    const exactBudgets: number[] = [];
    const exactContext = context({ A: 2, B: 3 }, exactBudgets);
    const exactTarget = {
      filter: {},
      count: 2,
      requiredNamesExact: ["A", "B"],
      totalPlayCostBudget: 5,
    } as Target;
    await expect(
      pickLoose(exactContext, exactTarget, [
        candidate("A1", "A"),
        candidate("A2", "A"),
        candidate("B1", "B"),
        candidate("B2", "B"),
      ]),
    ).resolves.toEqual(["A1", "B1"]);
    expect(exactBudgets).toEqual([5, 3]);

    const levelBudgets: number[] = [];
    const levelContext = context({ A: 2, B: 3 }, levelBudgets);
    const levelTarget = { filter: {}, count: 2, distinctLevels: true, totalPlayCostBudget: 5 } as Target;
    await expect(
      pickLoose(levelContext, levelTarget, [
        candidate("A1", "A"),
        candidate("A2", "A"),
        candidate("B1", "B"),
        candidate("B2", "B"),
      ]),
    ).resolves.toEqual(["A1", "B1"]);
    expect(levelBudgets).toEqual([5, 3]);
  });

  it("ignores a decision ID that is outside a specialized candidate group", async () => {
    const ctx = context({ A: 2 });
    (ctx.ask as unknown as { selectCards: () => Promise<string[]> }).selectCards = async () => ["MISSING"];
    const target = { filter: { distinctNames: true }, count: 1 } as Target;

    await expect(pickLoose(ctx, target, [candidate("A1", "A"), candidate("A2", "A")])).resolves.toEqual([]);
  });
});
