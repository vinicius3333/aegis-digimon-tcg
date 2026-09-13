import { describe, expect, it } from "vitest";
import { materializeLevelComparisonScaling, playCostScalingDelta, runPlayAction } from "./play.js";
import type { EffectContext } from "../../EffectContext.js";
import type { Permanent } from "@aegis/shared";

describe("PlayWithoutCost play-cost scaling", () => {
  it("adds the computed factor by default and honors an explicit additive bonus", () => {
    expect(playCostScalingDelta({ per: 1, unit: "cards" }, 3)).toBe(3);
    expect(playCostScalingDelta({ per: 1, unit: "cards", bonus: 2 }, 3)).toBe(6);
  });

  it("subtracts the requested amount per factor with precedence over bonus", () => {
    expect(playCostScalingDelta({ per: 1, unit: "cards", subtract: 1 }, 3)).toBe(-3);
    expect(playCostScalingDelta({ per: 1, unit: "cards", bonus: 99, subtract: 2 }, 3)).toBe(-6);
  });
});

describe("PlayWithoutCost level scaling", () => {
  it("materializes a dynamic level ceiling for loose-card matching", () => {
    const target = {
      filter: {
        levelComparison: {
          op: "lte" as const,
          value: 4,
          scaling: { per: 2, unit: "cards" as const },
        },
      },
      count: 1,
    };

    expect(materializeLevelComparisonScaling(target, 1)).toEqual({
      filter: { levelComparison: { op: "lte", value: 5 } },
      count: 1,
    });
  });

  it("leaves static level ceilings unchanged", () => {
    const target = { filter: { levelComparison: { op: "lte" as const, value: 4 } }, count: 1 };
    expect(materializeLevelComparisonScaling(target, 3)).toEqual(target);
  });
});

describe("PlayWithoutCost own-stack aggregate budget", () => {
  it("clamps an own-stack selection after combined play costs are applied", async () => {
    const played: string[][] = [];
    const sourcePermanent = {
      permanentId: "HOST",
      stack: [
        { instanceId: "A", cardId: "A", ownerSeat: 0 },
        { instanceId: "B", cardId: "B", ownerSeat: 0 },
      ],
    } as unknown as Permanent;
    const ctx = {
      source: {
        instanceId: "SOURCE",
        ownerSeat: 0,
        permanent: () => sourcePermanent,
      },
      game: {
        definitionOf: (card: { cardId: string }) =>
          ({
            cardId: card.cardId,
            nameEn: card.cardId,
            playCost: card.cardId === "A" ? 4 : 3,
            kinds: ["Digimon"],
          }) as never,
      },
      ask: {
        selectCards: async (_ctx: EffectContext, options: { candidates: string[] }) => options.candidates,
      },
      fx: {
        playInstances: async (ids: string[]) => {
          played.push(ids);
          return [];
        },
      },
    } as unknown as EffectContext;

    await runPlayAction(
      ctx,
      {
        kind: "PlayWithoutCost",
        fromOwnDigivolutionStack: true,
        target: { filter: {}, count: 2, upTo: true, totalPlayCostBudget: 5 },
        payCost: false,
      } as never,
      { scale: 1 } as never,
    );

    expect(played).toEqual([["A"]]);
  });
});
