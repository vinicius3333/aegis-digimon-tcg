import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT2/BT2-107.js";
import "../BT3/BT3-096.js";
import "../BT9/BT9-109.js";
import "./P-027.js";

describe("P-027 MetalGarurumon", () => {
  it("Digi-Bursts exactly 2 sources to use a purple cost-7-or-less Option for free", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-027", as: "metalGarurumon", under: ["P-019", "P-034"] },
            { card: "BT2-069", as: "recipient" },
            { card: "BT3-096", as: "mimi" },
          ],
          hand: [{ card: "BT2-107", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").permanentId);
    const recipientBase = s.perm("recipient").baseDP;
    const optionId = s.inst("option").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("metalGarurumon").topCard.instanceId,
        effectKey: "P-027/digi-burst-use-option",
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("metalGarurumon").stack.length === 0 &&
        s.perm("recipient").currentDP === recipientBase + 3000 &&
        s.state.players[0]!.trash.some((card) => card.instanceId === optionId) &&
        s.perm("mimi").isSuspended &&
        s.state.memory === 1,
    );

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
  });

  it("may pay Digi-Burst even when no eligible Option is selected", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-027", as: "metalGarurumon", under: ["P-019", "P-034"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("metalGarurumon").topCard.instanceId,
        effectKey: "P-027/digi-burst-use-option",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metalGarurumon").stack.length === 0);

    expect(s.state.players[0]!.trash).toHaveLength(2);
  });

  it("doesn't use an Option when X Antibody leaves only 1 trashable Digi-Burst source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-027", as: "metalGarurumon", under: ["BT9-109", "P-034"] }],
          hand: [{ card: "BT2-107", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("metalGarurumon").topCard.instanceId,
        effectKey: "P-027/digi-burst-use-option",
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
