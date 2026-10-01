import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT2/BT2-050.js";
import "../BT2/BT2-111.js";
import "../BT3/BT3-103.js";
import "./BT5-033.js";

describe("BT5-033 Cutemon", () => {
  it("prevents the opponent from reducing digivolution costs on their turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-033", as: "cutemon" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const { continuous } = s.engine as unknown as {
      continuous: { blocksCostReduction(seat: Seat, costType: "play" | "digivolve"): boolean };
    };
    expect(continuous.blocksCostReduction(1, "digivolve")).toBe(true);
    expect(continuous.blocksCostReduction(0, "digivolve")).toBe(false);
    expect(continuous.blocksCostReduction(1, "play")).toBe(false);
  });
});

interface CostReductionOutcome {
  digivolved: boolean;
  memoryPaid: number;
  payerSuspended: boolean;
}

async function digivolveAfterHiddenPotential(cutemonSeat: Seat): Promise<CostReductionOutcome> {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT3-054", as: "base" },
          { card: "BT3-044", as: "payer" },
          ...(cutemonSeat === 0 ? ["BT5-033"] : []),
        ],
        hand: [
          { card: "BT3-103", as: "option" },
          { card: "BT3-057", as: "evolving" },
        ],
        security: 5,
      },
      1: { battleArea: cutemonSeat === 1 ? ["BT5-033"] : [], security: 5 },
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
  await settle(() => s.perm("base").topCard.cardId === "BT3-057" && s.state.pendingDecision === undefined);
  return {
    digivolved: s.perm("base").topCard.cardId === "BT3-057",
    memoryPaid: memoryBefore - s.state.memory,
    payerSuspended: s.perm("payer").isSuspended,
  };
}

async function digivolveWithDigisorption(cutemonSeat: Seat): Promise<CostReductionOutcome> {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT2-046", as: "base" },
          { card: "BT2-043", as: "payer" },
          ...(cutemonSeat === 0 ? ["BT5-033"] : []),
        ],
        hand: [{ card: "BT2-050", as: "evolving" }],
        security: 5,
      },
      1: { battleArea: cutemonSeat === 1 ? ["BT5-033"] : [], security: 5 },
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

describe("BT5-033 Cutemon — KB Q&A rulings", () => {
  it("negates [Hidden Potential Discovered!]'s reduction so the opponent pays the printed digivolution cost (Q1313)", async () => {
    const opponentHasCutemon = await digivolveAfterHiddenPotential(1);
    expect(opponentHasCutemon).toEqual({ digivolved: true, memoryPaid: 4, payerSuspended: false });

    const ownCutemon = await digivolveAfterHiddenPotential(0);
    expect(ownCutemon).toEqual({ digivolved: true, memoryPaid: 0, payerSuspended: true });
  });

  it("stops the opponent's <Digisorption> from reducing their digivolution cost (Q1314)", async () => {
    const opponentHasCutemon = await digivolveWithDigisorption(1);
    expect(opponentHasCutemon).toEqual({ digivolved: true, memoryPaid: 5, payerSuspended: false });

    const ownCutemon = await digivolveWithDigisorption(0);
    expect(ownCutemon).toEqual({ digivolved: true, memoryPaid: 2, payerSuspended: true });
  });

  it("still lets the opponent digivolve Impmon into [Beelzemon] for its fixed memory cost of 4 (Q1315)", async () => {
    async function digivolveImpmonIntoBeelzemon(trashCount: number) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT2-068", as: "impmon" }],
          hand: [{ card: "BT2-111", as: "beelzemon" }],
          trash: trashCards(trashCount),
        },
        1: { battleArea: ["BT5-033"] },
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
