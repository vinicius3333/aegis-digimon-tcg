import { describe, expect, it } from "vitest";
import { requireCardDefinition, type Target } from "@aegis/shared";
import type { EffectContext } from "../../EffectContext.js";
import { createCardSource } from "../../../cards/CardSource.js";
import { makeInstance } from "../../../testkit/harness.js";
import { pickLoose, type LooseCandidate } from "./loose.js";

// Test-only producer intersections: no printed card is claimed to combine these fields.
function fixture(answers: string[][]) {
  const sourceCard = makeInstance("ST1-03", 0, true);
  const requests: { min: number; max: number }[] = [];
  const source = createCardSource(sourceCard, {
    permanentOf: () => undefined,
    isOnBattleArea: () => false,
    isSeatsTurn: () => true,
  });
  const ctx = {
    source,
    game: { definitionOf: (card: { cardId: string }) => requireCardDefinition(card.cardId) },
    ask: {
      selectCards: async (_ctx: EffectContext, request: { min: number; max: number }) => {
        requests.push(request);
        return answers.shift() ?? [];
      },
    },
  } as unknown as EffectContext;
  return { ctx, requests };
}
function pool(): LooseCandidate[] {
  return ["BT1-009", "ST1-06"].map((cardId) => {
    const card = makeInstance(cardId, 0, true);
    return { instanceId: card.instanceId, cardId, ownerSeat: card.ownerSeat };
  });
}
const shapes: [string, Partial<Target>][] = [
  ["distinct names", { filter: { distinctNames: true } }],
  ["distinct card numbers", { filter: {}, distinctCardNumbers: true }],
  ["distinct levels", { filter: {}, distinctLevels: true }],
  ["ordinary", { filter: {} }],
];
describe("explicit up-to minimum across selection encodings", () => {
  it.each(shapes)("accepts the complete minimum for %s", async (_label, shape) => {
    const candidates = pool();
    const ids = candidates.map((card) => card.instanceId);
    const sequential = shape.distinctLevels === true;
    const { ctx, requests } = fixture(sequential ? [[ids[0]!], [ids[1]!]] : [ids]);
    const result = await pickLoose(ctx, { filter: {}, ...shape, count: 2, upTo: true, minimum: 2 }, candidates);
    expect(result).toEqual(ids);
    expect(requests.map(({ min, max }) => ({ min, max }))).toEqual(
      sequential
        ? [
            { min: 1, max: 1 },
            { min: 1, max: 1 },
          ]
        : [{ min: 2, max: 2 }],
    );
  });
  it.each(shapes)("rejects a forged partial minimum for %s", async (_label, shape) => {
    const candidates = pool();
    const { ctx } = fixture([[candidates[0]!.instanceId], []]);
    expect(await pickLoose(ctx, { filter: {}, ...shape, count: 2, upTo: true, minimum: 2 }, candidates)).toEqual([]);
  });
  it.each(shapes)("does not lower an explicit minimum for a scarce %s pool", async (_label, shape) => {
    const candidates = pool().slice(0, 1);
    const { ctx, requests } = fixture([[candidates[0]!.instanceId]]);
    expect(await pickLoose(ctx, { filter: {}, ...shape, count: 2, upTo: true, minimum: 2 }, candidates)).toEqual([]);
    expect(requests).toEqual([]);
  });
  it("counts physical distinctness after duplicate and unknown answer sanitization", async () => {
    const candidates = pool();
    const { ctx } = fixture([[candidates[0]!.instanceId, candidates[0]!.instanceId, "missing-physical-id"]]);
    expect(await pickLoose(ctx, { filter: {}, count: 2, upTo: true, minimum: 2 }, candidates)).toEqual([]);
  });
});
