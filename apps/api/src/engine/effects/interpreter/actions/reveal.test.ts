import { describe, expect, it } from "vitest";
import { getCardDefinition, type Action, type CardInstance } from "@aegis/shared";
import type { EffectContext } from "../../EffectContext.js";
import { compiled as eldradimon } from "../../../../cards/EX7/EX7-047.js";
import { runRevealAdd } from "./reveal.js";

// Recording-port proof of the current compiled producer, not a public gameplay fixture.
// The real EX7-047 public play/evolution witnesses remain in its colocated card suite.
describe("current EX7-047 reveal aggregate budget adapter", () => {
  it.each([
    ["equality", ["three", "four"], ["four", "three"], ["seven", "miss"]],
    ["refusal", [], [], ["three", "four", "seven", "miss"]],
    [
      "forged over-budget, duplicate and noncandidate IDs",
      ["seven", "four", "three", "three", "miss", "absent"],
      ["four", "three"],
      ["seven", "miss"],
    ],
  ])("preserves the physical disposition for %s", async (_label, answer, expectedPlayed, expectedBottom) => {
    const cards = [
      ["three", "EX7-038"],
      ["four", "EX7-041"],
      ["seven", "EX7-045"],
      ["miss", "BT1-009"],
    ].map(([instanceId, cardId]) => ({ instanceId, cardId, ownerSeat: 0, faceUp: true }) as CardInstance);
    const played: string[] = [];
    const staged: string[] = [];
    const bottom: string[] = [];
    const prompts: unknown[] = [];
    const ctx = {
      source: { ownerSeat: 0, cardId: "EX7-047" },
      game: { definitionOf: (card: CardInstance) => getCardDefinition(card.cardId)! },
      ask: {
        selectCards: async (_ctx: EffectContext, options: unknown) => {
          prompts.push(options);
          return answer;
        },
      },
      fx: {
        reveal: async () => cards,
        returnToHand: async (ids: string[]) => {
          staged.push(...ids);
        },
        playInstances: async (ids: string[], options: unknown) => {
          expect(options).toEqual({ payCost: false });
          played.push(...ids);
          return [];
        },
        returnToDeck: async (ids: string[], options: unknown) => {
          expect(options).toEqual({ toTop: false, suppressWhenEffectAddsToDeck: true });
          bottom.push(...ids);
        },
      },
    } as unknown as EffectContext;
    const action = eldradimon.effects.find((effect) => effect.trigger === "OnPlay")!.actions[0]!;
    expect(action).toMatchObject({ kind: "RevealAdd", add: [{ totalPlayCostBudget: 7 }] });

    await runRevealAdd(ctx, action as Extract<Action, { kind: "RevealAdd" }>);

    expect(prompts).toEqual([
      expect.objectContaining({
        candidates: ["three", "four", "seven"],
        visible: ["three", "four", "seven", "miss"],
        min: 0,
        max: 3,
        maxTotalPlayCost: 7,
      }),
    ]);
    expect(played).toEqual(expectedPlayed);
    expect(staged).toEqual(expectedPlayed);
    expect(bottom).toEqual(expectedBottom);
    expect(new Set([...played, ...bottom])).toEqual(new Set(cards.map((card) => card.instanceId)));
    expect(played.length + bottom.length).toBe(cards.length);
  });
});
