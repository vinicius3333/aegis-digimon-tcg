import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT2/BT2-050.js";
import "../BT2/BT2-111.js";
import "../BT3/BT3-103.js";
import "./BT5-008.js";

describe("BT5-008 Gaossmon", () => {
  it("gives every other Gaossmon +3000 DP on its turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-008", as: "source", under: ["BT5-001"] },
          { card: "BT5-008", as: "other-a" },
          { card: "BT5-008", as: "other-b" },
          { card: "BT1-009", as: "unrelated" },
        ],
      },
      1: {
        battleArea: [{ card: "BT5-008", as: "opponent-gaossmon" }],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT5-001"]);
    expect(s.perm("source").currentDP).toBe(s.perm("source").baseDP + 6000);
    expect(s.perm("other-a").currentDP).toBe(s.perm("other-a").baseDP + 6000);
    expect(s.perm("other-b").currentDP).toBe(s.perm("other-b").baseDP + 6000);
    expect(s.perm("unrelated").currentDP).toBe(s.perm("unrelated").baseDP);
    expect(s.perm("opponent-gaossmon").currentDP).toBe(s.perm("opponent-gaossmon").baseDP);
  });

  it("gates the aura and cost block to the printed turn owners", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-008", as: "source" },
          { card: "BT5-008", as: "ally" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT5-008", as: "opponent" },
          { card: "BT5-008", as: "opponent-other" },
        ],
      },
    });

    await s.engine.recomputeContinuousEffects();
    expect(s.perm("ally").currentDP).toBe(s.perm("ally").baseDP + 3000);
    expect(s.perm("opponent").currentDP).toBe(s.perm("opponent").baseDP);
    expect((s.engine as any).continuous.blocksCostReduction(1, "digivolve")).toBe(false);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("ally").currentDP).toBe(s.perm("ally").baseDP);
    expect(s.perm("opponent").currentDP).toBe(s.perm("opponent").baseDP + 3000);
    expect(s.perm("opponent-other").currentDP).toBe(s.perm("opponent-other").baseDP + 3000);
    expect((s.engine as any).continuous.blocksCostReduction(1, "digivolve")).toBe(true);
    expect((s.engine as any).continuous.blocksCostReduction(0, "digivolve")).toBe(false);
  });

  it("prevents the opponent from reducing digivolution costs on their turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-008", as: "source" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect((s.engine as any).continuous.blocksCostReduction(1, "digivolve")).toBe(true);
    expect((s.engine as any).continuous.blocksCostReduction(0, "digivolve")).toBe(false);
  });
});

interface CostReductionOutcome {
  digivolved: boolean;
  memoryPaid: number;
  payerSuspended: boolean;
}

async function digivolveAfterHiddenPotential(gaossmonSeat: Seat): Promise<CostReductionOutcome> {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT3-054", as: "base" },
          { card: "BT3-044", as: "payer" },
          ...(gaossmonSeat === 0 ? ["BT5-008"] : []),
        ],
        hand: [
          { card: "BT3-103", as: "option" },
          { card: "BT3-057", as: "evolving" },
        ],
        security: 5,
      },
      1: { battleArea: gaossmonSeat === 1 ? ["BT5-008"] : [], security: 5 },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
  );
  preferred.push(s.perm("payer").topCard.instanceId);
  s.state.memory = 10;
  await s.ready();
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-103"));
  const memoryBefore = s.state.memory;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === "BT3-057");
  return {
    digivolved: s.perm("base").topCard.cardId === "BT3-057",
    memoryPaid: memoryBefore - s.state.memory,
    payerSuspended: s.perm("payer").isSuspended,
  };
}

async function digivolveWithDigisorption(gaossmonSeat: Seat): Promise<CostReductionOutcome> {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT2-046", as: "base" },
          { card: "BT2-043", as: "payer" },
          ...(gaossmonSeat === 0 ? ["BT5-008"] : []),
        ],
        hand: [{ card: "BT2-050", as: "evolving" }],
        security: 5,
      },
      1: { battleArea: gaossmonSeat === 1 ? ["BT5-008"] : [], security: 5 },
    },
    { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
  );
  preferred.push(s.perm("payer").topCard.instanceId);
  s.state.memory = 5;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("base").topCard.cardId === "BT2-050" && s.state.pendingDecision === undefined);
  return {
    digivolved: s.perm("base").topCard.cardId === "BT2-050",
    memoryPaid: 5 - s.state.memory,
    payerSuspended: s.perm("payer").isSuspended,
  };
}

function trashCards(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    card: `BT1-${String((index % 8) + 1).padStart(3, "0")}`,
  }));
}

describe("BT5-008 Gaossmon — KB Q&A rulings", () => {
  it("negates [Hidden Potential Discovered!]'s reduction so the opponent pays the printed digivolution cost (Q1285)", async () => {
    const opponentHasGaossmon = await digivolveAfterHiddenPotential(1);
    expect(opponentHasGaossmon).toEqual({ digivolved: true, memoryPaid: 4, payerSuspended: false });

    const ownGaossmon = await digivolveAfterHiddenPotential(0);
    expect(ownGaossmon).toEqual({ digivolved: true, memoryPaid: 0, payerSuspended: true });
  });

  it("stops the opponent's <Digisorption> from reducing their digivolution cost (Q1286)", async () => {
    const opponentHasGaossmon = await digivolveWithDigisorption(1);
    expect(opponentHasGaossmon).toEqual({ digivolved: true, memoryPaid: 5, payerSuspended: false });

    const ownGaossmon = await digivolveWithDigisorption(0);
    expect(ownGaossmon).toEqual({ digivolved: true, memoryPaid: 2, payerSuspended: true });
  });

  it("still lets the opponent digivolve Impmon into [Beelzemon] for its fixed memory cost of 4 (Q1287)", async () => {
    async function digivolveImpmonIntoBeelzemon(trashCount: number) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT2-068", as: "impmon" }],
          hand: [{ card: "BT2-111", as: "beelzemon" }],
          trash: trashCards(trashCount),
        },
        1: { battleArea: ["BT5-008"] },
      });
      s.state.memory = 5;
      await s.ready();
      const probe = s.engine as unknown as {
        continuous: { blocksCostReduction(seat: Seat, costType: "digivolve"): boolean };
      };
      expect(probe.continuous.blocksCostReduction(0, "digivolve")).toBe(true);

      const result = s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("impmon").permanentId,
        instanceId: s.inst("beelzemon").instanceId,
      });
      if (result.ok) await settle(() => s.perm("impmon").topCard.cardId === "BT2-111");
      return { accepted: result.ok, topCard: s.perm("impmon").topCard.cardId, memory: s.state.memory };
    }

    expect(await digivolveImpmonIntoBeelzemon(10)).toEqual({ accepted: true, topCard: "BT2-111", memory: 1 });
    expect(await digivolveImpmonIntoBeelzemon(9)).toEqual({ accepted: false, topCard: "BT2-068", memory: 5 });
  });
});
