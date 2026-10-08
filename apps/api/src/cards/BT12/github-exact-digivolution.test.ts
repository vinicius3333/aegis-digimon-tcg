import { expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const cases = [
  ["BT12-072", "BT7-017", 2],
  ["BT12-072", "EX1-073", 2],
  ["BT12-073", "BT2-068", 0],
  ["BT12-078", "BT2-071", 0],
  ["BT12-082", "BT10-081", 0],
  ["BT12-085", "BT2-111", 1],
] as const;

it.each(cases)(
  "GitHub #5289 sweep: %s rejects itself and retains exact base %s for %i",
  async (cardId, baseId, cost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "self" },
            { card: baseId, as: "valid" },
          ],
          hand: [{ card: cardId, as: "evolving" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.inst("evolving").digivolveTargetPermanentIds).not.toContain(s.perm("self").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("self").permanentId,
        instanceId: s.inst("evolving").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(10);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("valid").permanentId,
        instanceId: s.inst("evolving").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.engine.mainVerbContinuationsInFlight === 0);
    expect(s.perm("valid").topCard.instanceId).toBe(s.inst("evolving").instanceId);
    expect(s.perm("self").topCard.instanceId).toBe(s.inst("self").instanceId);
    expect(s.state.memory).toBe(10 - cost);
  },
);
