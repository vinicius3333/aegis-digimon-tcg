import { describe, it, expect } from "vitest";
import { EffectTiming, getCardDefinition, type Seat } from "@aegis/shared";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT23-083.js";

/**
 * Full-engine A3 for BT23-083 Fei's [All Turns] when-add-security clause (plan 08-02),
 * REUSING the Phase-7 `whenAddSecurity` SubTrigger event (NOT rebuilt):
 *
 *   "[All Turns] When cards are placed face up in your security stack, if any of them have the
 *    [Zaxon] or [Royal Base] trait, by suspending this Tamer, gain 1 memory. Then, if you have
 *    7 or fewer cards in your hand, <Draw 1>."  (documented behavior EffectTiming.OnAddSecurity)
 *
 * KB authority (node tools/kb/query.mjs card BT23-083):
 *   Q5356: the part after "then" (the <Draw 1>) — and the gain-memory — cannot be processed
 *     without the "by" (suspend) condition. Declining the suspend yields no memory and no draw.
 *
 * Gates proven: YOUR security (addedToSecuritySeat) + a [Zaxon]/[Royal Base] face-up trait on
 * an added card (the fire-time gate); the suspend cost gates the whole tail (Q5356).
 *
 * FAILS-WHEN-REVERTED: drop the SubTrigger consumer from BT23-083.ts — adding a [Zaxon] card to
 * your security gains no memory => the +1-memory assertion goes RED.
 */

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

function fireStartMain(s: EngineSetup): Promise<void> {
  return (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
    EffectTiming.OnStartMainPhase,
  );
}

const ZAXON = "BT23-015"; // a real [Zaxon]-trait Digimon
const PLAIN = "AD1-001"; // neither [Zaxon] nor [Royal Base]
const FEI = "BT23-083";

describe("A3 BT23-083 — whenAddSecurity consumer: suspend Fei to gain 1 memory on a [Zaxon] add", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition(FEI)).toMatchObject({
      cardId: FEI,
      nameEn: "Fei",
      colors: ["Green", "Black"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["Zaxon", "CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    const watcher = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];
    expect(watcher.actions[0]).toMatchObject({ kind: "Suspend", optional: true, abortOnDecline: true });
  });

  it("gains start-main memory only during Fei's controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: FEI }, { card: ZAXON }] },
    });

    const beforeOwnTurn = s.state.memory;
    await fireStartMain(s);
    expect(s.state.memory).toBe(beforeOwnTurn + 1);

    s.state.turnSeat = 1;
    const beforeOpponentTurn = s.state.memory;
    await fireStartMain(s);
    expect(s.state.memory).toBe(beforeOpponentTurn);
  });

  it("a [Zaxon] card added face up to YOUR security suspends Fei and gains 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: FEI, dp: 4000, as: "fei" }],
          hand: [{ card: ZAXON, as: "zaxon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true },
    );
    const p0 = s.state.players[0];
    const zaxonId = s.inst("zaxon").instanceId;

    await s.engine.recomputeContinuousEffects();
    const memoryBefore = s.state.memory;

    await primitivesOf(s).addSecurity(0 as Seat, [zaxonId], { faceUp: true });
    await settle(() => s.state.memory !== memoryBefore);

    expect(p0?.security.some((c) => c.instanceId === zaxonId)).toBe(true);
    // FAILS-WHEN-REVERTED: drop the whenAddSecurity consumer => no suspend, no memory.
    expect(Math.abs(s.state.memory - memoryBefore)).toBe(1); // +1 memory (toward seat 0)
    expect(s.perm("fei").isSuspended).toBe(true); // the "by suspending this Tamer" cost was paid
    expect(p0?.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("declining the suspend gains NO memory (Q5356 — the 'by' cost gates the tail)", async () => {
    // No autoAcceptOptional — respond to the "by suspending this Tamer" prompt manually,
    // declining it, since the harness's opts only express auto-accept, not auto-decline.
    const s = setupEngine({
      0: { battleArea: [{ card: FEI, dp: 4000, as: "fei" }], hand: [{ card: ZAXON, as: "zaxon" }] },
    });
    const zaxonId = s.inst("zaxon").instanceId;

    await s.engine.recomputeContinuousEffects();
    const memoryBefore = s.state.memory;

    // Don't await addSecurity directly — it awaits the "by suspending" prompt internally, so
    // awaiting it here first would deadlock against the manual response below.
    const pending = primitivesOf(s).addSecurity(0 as Seat, [zaxonId], { faceUp: true });
    await settle(() => s.decisions.some((d) => d.req.kind === "optional"), 60);
    const prompt = s.decisions.find((d) => d.req.kind === "optional");
    expect(prompt).toBeDefined();
    if (prompt !== undefined) {
      s.engine.applyIntent(prompt.seat, {
        type: "respondDecision",
        decisionId: prompt.req.decisionId,
        response: { kind: "optional", accept: false },
      });
    }
    await pending;
    await settle(() => false, 60);

    expect(s.state.memory).toBe(memoryBefore); // suspend declined => no memory (Q5356)
    expect(s.perm("fei").isSuspended).toBe(false);
  });

  it("gains memory but does not draw when 8 cards remain in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: FEI, as: "fei" }],
          hand: [{ card: ZAXON, as: "zaxon" }, ...Array.from({ length: 8 }, () => PLAIN)],
          deck: [{ card: "BT1-009", as: "deckTop" }],
        },
      },
      { autoAcceptOptional: true },
    );
    const before = s.state.memory;
    await s.ready();
    await primitivesOf(s).addSecurity(0 as Seat, [s.inst("zaxon").instanceId], { faceUp: true });
    expect(s.state.memory).toBe(before + 1);
    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-009");
  });

  it("a NON-[Zaxon]/[Royal Base] add gains no memory (trait gate)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: FEI, dp: 4000 }], hand: [{ card: PLAIN, as: "plain" }] } },
      { autoAcceptOptional: true },
    );
    const plainId = s.inst("plain").instanceId;

    await s.engine.recomputeContinuousEffects();
    const memoryBefore = s.state.memory;

    await primitivesOf(s).addSecurity(0 as Seat, [plainId], { faceUp: true });
    await settle(() => false, 60);

    expect(s.state.memory).toBe(memoryBefore); // wrong trait => the fire-time gate skips the body
  });

  it("a [Zaxon] card added to the OPPONENT's security gains YOU no memory (your-security gate)", async () => {
    // Fei is on SEAT 0's field
    const s = setupEngine(
      { 0: { battleArea: [{ card: FEI, dp: 4000 }] }, 1: { hand: [{ card: ZAXON, as: "zaxon" }] } },
      { autoAcceptOptional: true },
    );
    const zaxonId = s.inst("zaxon").instanceId;

    await s.engine.recomputeContinuousEffects();
    const memoryBefore = s.state.memory;

    // The add grows the OPPONENT's (seat 1) security — not "your security".
    await primitivesOf(s).addSecurity(1 as Seat, [zaxonId], { faceUp: true });
    await settle(() => false, 60);

    expect(s.state.memory).toBe(memoryBefore); // not your security => the gate skips the body
  });

  it("a face-DOWN [Zaxon] add gains no memory (face-up requirement — documented behavior !IsFlipped)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: FEI, dp: 4000 }], hand: [{ card: ZAXON, as: "zaxon" }] } },
      { autoAcceptOptional: true },
    );
    const zaxonId = s.inst("zaxon").instanceId;

    await s.engine.recomputeContinuousEffects();
    const memoryBefore = s.state.memory;

    // ＜Recovery＞-style face-down add — the documented behavior SecurityCondition requires !IsFlipped.
    await primitivesOf(s).addSecurity(0 as Seat, [zaxonId], { faceUp: false });
    await settle(() => false, 60);

    expect(s.state.memory).toBe(memoryBefore); // face-down => the trait gate never holds
  });
});
