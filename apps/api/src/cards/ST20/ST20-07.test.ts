import type { Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT2/BT2-050.js";
import "./ST20-06.js";
import "./ST20-07.js";
import "./ST20-08.js";

describe("ST20-07 Tentomon", () => {
  it("blocks only the opponent's digivolution cost reductions during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST20-07", as: "tentomon" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const ledger = (
      s.engine as unknown as {
        continuous: { blocksCostReduction: (seat: number, costType: "play" | "digivolve") => boolean };
      }
    ).continuous;
    expect(ledger.blocksCostReduction(1, "digivolve")).toBe(true);
    expect(ledger.blocksCostReduction(0, "digivolve")).toBe(false);
    expect(ledger.blocksCostReduction(1, "play")).toBe(false);
  });
});

async function digivolveWithDigisorption(tentomonSeat: Seat) {
  const preferred: string[] = [];
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "BT2-046", as: "base" },
          { card: "BT2-043", as: "payer" },
          ...(tentomonSeat === 0 ? ["ST20-07"] : []),
        ],
        hand: [{ card: "BT2-050", as: "evolving" }],
        security: 5,
      },
      1: { battleArea: tentomonSeat === 1 ? ["ST20-07"] : [], security: 5 },
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
  return { memoryPaid: 5 - s.state.memory, payerSuspended: s.perm("payer").isSuspended };
}

describe("ST20-07 Tentomon — KB Q&A rulings", () => {
  it("makes the opponent pay the full digivolution cost when they would reduce it (Q4451)", async () => {
    expect(await digivolveWithDigisorption(1)).toEqual({ memoryPaid: 5, payerSuspended: false });
    expect(await digivolveWithDigisorption(0)).toEqual({ memoryPaid: 2, payerSuspended: true });
  });

  it("still lets the opponent digivolve without paying the cost through an effect (Q4452)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-07", as: "base" }],
          hand: [
            { card: "ST20-06", as: "angewomon" },
            { card: "ST20-08", as: "kabuterimon" },
          ],
          security: 5,
        },
        1: { battleArea: [{ card: "ST20-07", as: "restrictor" }], security: 5 },
      },
      { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Attack with a Digimon"] },
    );
    s.state.memory = 10;
    await s.ready();
    const ledger = (
      s.engine as unknown as {
        continuous: { blocksCostReduction: (seat: Seat, costType: "play" | "digivolve") => boolean };
      }
    ).continuous;
    expect(ledger.blocksCostReduction(0, "digivolve")).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angewomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard.cardId === "ST20-08" && s.state.pendingDecision === undefined);

    expect(s.perm("base").topCard.instanceId).toBe(s.inst("kabuterimon").instanceId);
    expect(s.state.memory).toBe(10 - 7);
  });
});
