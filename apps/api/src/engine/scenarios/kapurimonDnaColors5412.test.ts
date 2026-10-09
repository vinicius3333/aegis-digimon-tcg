import { expect, it } from "vitest";
import "../../cards/index.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, assertNoLoudGap } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

// Q6725: Kapurimon permits DNA timing, and never waives the destination's recipe.
it.each([
  { partner: "EX9-018", legal: false },
  { partner: "EX12-032", legal: true },
])("#5412: EX12-003 honors MetalGarurumon's DNA colors with $partner (legal=$legal)", async ({ partner, legal }) => {
  const s = setupEngine(
    {
      0: {
        battleArea: [
          { card: "EX12-016", as: "metal", under: ["EX12-053"] },
          { card: partner, as: "partner" },
          { card: "EX12-008", as: "carrier", under: ["EX12-003"] },
        ],
        hand: [
          { card: "EX12-053", as: "spare" },
          { card: "EX12-035", as: "garuru" },
        ],
        deck: Array(12).fill("BT1-009"),
      },
      1: {
        battleArea: [{ card: "BT1-084", as: "wall", suspended: true }],
        security: Array(3).fill("BT1-009"),
        deck: Array(12).fill("BT1-009"),
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  const loop = s.engine.startTurnLoop();
  try {
    await advance(s.engine).waitForMainPhase(0);
    const garuru = s.inst("garuru").instanceId;
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(garuru);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metal").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((e) => e.kind === "attackEnded") && !observe(s.engine).isAttacking() && !s.state.pendingDecision,
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === garuru)).toBe(legal);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === garuru)).toBe(!legal);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("metal").instanceId)).toBe(!legal);
    expect(s.perm("carrier").stack.map((c) => c.cardId)).toEqual(["EX12-003"]);
    assertNoLoudGap(s);
  } finally {
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
});
