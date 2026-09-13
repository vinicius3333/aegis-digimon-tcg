import { describe, expect, it } from "vitest";
import type { Cost } from "@aegis/shared";
import { setupEngine } from "../../../testkit/harness.js";
import { internalsOf } from "../../../testkit/internals.js";
import { canPayCost, payCost } from "../costs.js";
import "../../../../cards/index.js";

// Synthetic cost producer, real source cards and production atomic payment primitive.
function cost(minimum: number): Cost {
  return {
    kind: "trash",
    target: {
      filter: { controller: "mine", zone: "digivolutionCards", sameHost: true },
      count: 3,
      upTo: true,
      minimum,
    },
  };
}
describe("same-host up-to atomic costs", () => {
  it("offers a smaller host and pays only the chosen physical source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST1-03", as: "small", under: [{ card: "BT1-009", as: "one" }] },
          { card: "ST1-03", as: "large", under: ["BT1-009", "BT1-010", "BT1-011"] },
        ],
      },
    });
    await s.ready();
    const internals = internalsOf(s.engine);
    const ctx = internals.buildEffectContext(internals.cardSourceOf(s.inst("small")), {});
    const offered: string[][] = [];
    ctx.ask.chooseTargets = async (_ctx, request) => {
      offered.push(request.candidates);
      return [s.perm("small").permanentId];
    };
    ctx.ask.selectCards = async () => [s.inst("one").instanceId];
    expect(canPayCost(ctx, cost(1))).toBe(true);
    const paid = { paidCount: 0 };
    expect(await payCost(ctx, cost(1), paid)).toBe(true);
    expect(offered).toEqual([[s.perm("small").permanentId, s.perm("large").permanentId]]);
    expect(paid.paidCount).toBe(1);
    expect(s.perm("small").stack).toHaveLength(0);
    expect(s.perm("large").stack).toHaveLength(3);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("one").instanceId]);
  });
  it("refuses an unattainable explicit minimum without moving any source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST1-03", as: "host", under: [{ card: "BT1-009", as: "one" }] }] },
    });
    await s.ready();
    const internals = internalsOf(s.engine);
    const ctx = internals.buildEffectContext(internals.cardSourceOf(s.inst("host")), {});
    let prompts = 0;
    ctx.ask.selectCards = async () => {
      prompts++;
      return [s.inst("one").instanceId];
    };
    expect(await payCost(ctx, cost(2))).toBe(false);
    expect(prompts).toBe(0);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([s.inst("one").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});

// The source-local encoding has its own payment path and must enforce the same minimum.
describe("source-local up-to costs", () => {
  it.each(["scarce", "duplicate answer"])("rejects %s before trashing physical cards", async (mode) => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "ST1-03",
            as: "host",
            under: [{ card: "BT1-009", as: "one" }, ...(mode === "scarce" ? [] : [{ card: "BT1-010", as: "two" }])],
          },
        ],
      },
    });
    await s.ready();
    const internals = internalsOf(s.engine);
    const ctx = internals.buildEffectContext(internals.cardSourceOf(s.inst("host")), {});
    const payment: Cost = {
      kind: "trash",
      target: {
        filter: { controller: "mine", zone: "digivolutionCards", isSelfRef: true },
        count: 3,
        upTo: true,
        minimum: 2,
      },
    };
    const before = s.perm("host").stack.map((card) => card.instanceId);
    let prompts = 0;
    ctx.ask.selectCards = async () => {
      prompts++;
      return mode === "scarce" ? [s.inst("one").instanceId] : [s.inst("one").instanceId, s.inst("one").instanceId];
    };
    expect(await payCost(ctx, payment)).toBe(false);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual(before);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(prompts).toBe(mode === "scarce" ? 0 : 1);
  });
});

describe("up-to cost eligibility and complete payment agree", () => {
  it.each(["source local", "same host"])("allows a complete minimum below the maximum for %s", async (encoding) => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "ST1-03",
            as: "host",
            under: [
              { card: "BT1-009", as: "one" },
              { card: "BT1-010", as: "two" },
            ],
          },
        ],
      },
    });
    await s.ready();
    const internals = internalsOf(s.engine);
    const ctx = internals.buildEffectContext(internals.cardSourceOf(s.inst("host")), {});
    const payment: Cost = {
      kind: "trash",
      target: {
        filter: {
          controller: "mine",
          zone: "digivolutionCards",
          ...(encoding === "source local" ? { isSelfRef: true } : { sameHost: true }),
        },
        count: 3,
        upTo: true,
        minimum: 2,
      },
    };
    ctx.ask.selectCards = async () => [s.inst("one").instanceId, s.inst("two").instanceId];
    expect(canPayCost(ctx, payment)).toBe(true);
    const out = { paidCount: 0 };
    expect(await payCost(ctx, payment, out)).toBe(true);
    expect(out.paidCount).toBe(2);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("one").instanceId,
      s.inst("two").instanceId,
    ]);
  });
});
