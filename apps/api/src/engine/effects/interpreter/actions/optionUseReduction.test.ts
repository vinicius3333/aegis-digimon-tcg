import { describe, expect, it } from "vitest";
import { getCardDefinition, type Action } from "@aegis/shared";
import type { EffectContext } from "../../EffectContext.js";
import { setupEngine } from "../../../testkit/harness.js";
import { canAttemptUseOptionWithoutCost, runUseOptionWithoutCost } from "./borrowed.js";

const action: Extract<Action, { kind: "UseOptionWithoutCost" }> = {
  kind: "UseOptionWithoutCost",
  filter: { zone: "hand", kind: ["Option"] },
  payCost: true,
  reduceCostBy: 4,
  reduceCostByScaling: { unit: "cards", per: 1, filter: { controller: "any", kind: ["Digimon"], suspended: true } },
};

function harness(count: number) {
  const s = setupEngine({
    0: { hand: [{ card: "BT13-110", as: "option" }], battleArea: [{ card: "EX2-052", as: "source" }] },
    1: {
      battleArea: Array.from({ length: count }, (_, index) => ({
        card: "BT10-064",
        as: `target${index}`,
        suspended: true,
      })),
    },
  });
  const affordability: unknown[] = [];
  const uses: unknown[] = [];
  const ctx = {
    source: { ownerSeat: 0, permanent: () => s.perm("source"), instanceId: s.inst("source").instanceId },
    trigger: {},
    game: {
      state: s.state,
      player: (seat: 0 | 1) => s.state.players[seat],
      opponentOf: (seat: 0 | 1) => (seat === 0 ? 1 : 0),
      definitionOf: (card: { cardId: string }) => getCardDefinition(card.cardId)!,
    },
    ask: { selectCards: async () => [s.inst("option").instanceId] },
    fx: {
      canAffordEffectPlay: async (id: string, options: { costDelta: number }) => {
        affordability.push({ id, ...options });
        return options.costDelta >= 6;
      },
      resolveCardEffect: async () => true,
      useOptionFromHand: async (_ctx: EffectContext, id: string, cost: number, options: unknown) => {
        uses.push({ id, cost, options });
        _ctx.lastOptionUsed = true;
        return [];
      },
    },
  } as unknown as EffectContext;
  return { s, ctx, affordability, uses };
}

describe("scaled Option-use reduction adapters", () => {
  it.each([
    [1, false, 5],
    [2, true, 6],
  ])("preflights %i suspended Digimon with the full discount", async (count, possible, delta) => {
    const h = harness(count);
    expect(await canAttemptUseOptionWithoutCost(h.ctx, action)).toBe(possible);
    expect(h.affordability).toEqual([
      { id: h.s.inst("option").instanceId, costDelta: delta, useAsOption: true, controllerSeat: 0 },
    ]);
    expect(h.uses).toEqual([]);
  });
  it("forwards the same full reduction once while retaining printed use cost", async () => {
    const h = harness(2);
    await runUseOptionWithoutCost(h.ctx, action);
    expect(h.uses).toEqual([{ id: h.s.inst("option").instanceId, cost: 6, options: { payCost: true, costDelta: 6 } }]);
    expect(h.ctx.lastOptionUsedInstanceId).toBe(h.s.inst("option").instanceId);
  });
  it("combines scaling with an existing opponent-memory reduction", async () => {
    const h = harness(2);
    h.s.state.turnSeat = 1;
    h.s.state.memory = 3;
    const combined = { ...action, reduceCostByOpponentMemory: true };
    expect(await canAttemptUseOptionWithoutCost(h.ctx, combined)).toBe(true);
    await runUseOptionWithoutCost(h.ctx, combined);
    expect(h.affordability).toEqual([
      { id: h.s.inst("option").instanceId, costDelta: 9, useAsOption: true, controllerSeat: 0 },
    ]);
    expect(h.uses).toEqual([{ id: h.s.inst("option").instanceId, cost: 6, options: { payCost: true, costDelta: 9 } }]);
  });
});
