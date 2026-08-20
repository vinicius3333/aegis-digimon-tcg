import { describe, it, expect } from "vitest";
import type { PlayerState, Seat } from "@aegis/shared";
import {
  makeInstance as instance,
  makeDigimon as digimon,
  setupEngine as setup,
  settle,
  assertNoLoudGap,
  type EngineSetup as Setup,
} from "./testkit/harness.js";
// Self-registers every compiled-IR card module (boot side-effect), same as mechanic.test.ts.
import "../cards/index.js";

/**
 * Behavioral proof for the `whenUnsuspended` SubTrigger event (Lane R7): the engine now
 * fires it at every genuine suspended -> unsuspended transition — the turn-start unsuspend
 * phase (GameEngine.unsuspendAllForSeat), the ＜Reboot＞ unsuspend
 * (GameEngine.unsuspendRebootForSeat), and the effect-driven `Unsuspend` IR action
 * (primitives.ts's `unsuspend`) — driving the REAL GameEngine end to end for 4 of the
 * 23 previously-dead cards, plus two negative controls (the opposite-event trap this
 * cluster started from).
 *
 * All four cards below carry NO `isInherited` flag in their compiled IR (their printed
 * effect activates as the permanent's own top card, not from a digivolution stack) —
 * picked deliberately to keep the board setup a plain top-card permanent.
 *
 * FAILS-WHEN-REVERTED (proven by hand, see Lane R7 report): commenting out either
 * `fireSubTrigger("whenUnsuspended", ...)` call site — primitives.ts's `unsuspend`
 * primitive, or GameEngine.ts's `unsuspendForActivePhase` — turns every "becomes
 * unsuspended" test below RED.
 */

interface LedgerReader {
  hasKeyword(permanentId: string, keyword: string): boolean;
}
function ledger(s: Setup): LedgerReader {
  return (s.engine as unknown as { continuous: LedgerReader }).continuous;
}

/** ＜Piercing＞ has its own dedicated store (modifiers.ts), not the generic keyword ledger. */
function hasPierce(s: Setup, permanentId: string): boolean {
  return (
    s.engine as unknown as { modifiers: { hasPierce(id: string): boolean } }
  ).modifiers.hasPierce(permanentId);
}

/** Drive the private turn-start unsuspend seam directly (mirrors mechanic.test.ts's BT14-047 test). */
async function unsuspendForActivePhase(s: Setup, seat: Seat): Promise<string[]> {
  return (
    s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }
  ).unsuspendForActivePhase(seat);
}

/**
 * Force a continuous-tier recompute so a hand-laid permanent's Static/YourTurn/AllTurns
 * SubTrigger installs (and keyword grants like ＜Reboot＞) exist BEFORE a seam is driven —
 * a played card gets this for free via the normal resolution path; a board built directly
 * by the test (no play) does not.
 */
async function recomputeContinuous(s: Setup): Promise<void> {
  await (
    s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }
  ).recomputeContinuousEffects();
}

describe("whenUnsuspended SubTrigger fires at every unsuspend seam", () => {
  it("effect-driven seam: BT12-029 returns the opponent's lowest-level Digimon when EX7-019 unsuspends it", async () => {
    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const target = digimon(0, 12000, "BT12-029");
    target.isSuspended = true;
    p0.battleArea.push(target);
    p0.battleArea.push(digimon(0, 0, "AD1-019")); // blue Tamer — satisfies BT12-029's condition
    const foe = digimon(1, 4000, "AD1-001");
    p1.battleArea.push(foe);
    await recomputeContinuous(s); // install BT12-029's "[All Turns] when this becomes unsuspended" watcher

    const source = instance("EX7-019", 0, false); // Digimon, cost 5, [On Play] Unsuspend 1 of your Digimon
    p0.hand.push(source);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !target.isSuspended && !p1.battleArea.includes(foe));

    expect(target.isSuspended).toBe(false);
    expect(p1.battleArea.includes(foe)).toBe(false);
    expect(p1.hand.some((c) => c.instanceId === foe.topCard?.instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("turn-start seam: BT11-032 returns an opponent's level<=3 Digimon when the Active-phase unsuspend flips it", async () => {
    // The bounce asks which opponent Digimon to return, so the harness answers for the seat.
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const target = digimon(0, 12000, "BT11-032");
    target.isSuspended = true;
    p0.battleArea.push(target);
    const foe = digimon(1, 1000, "BT1-009"); // level 3
    p1.battleArea.push(foe);
    await recomputeContinuous(s); // install BT11-032's "[Your Turn] when this becomes unsuspended" watcher

    await unsuspendForActivePhase(s, 0);
    await settle(() => !p1.battleArea.includes(foe), 5000);

    expect(target.isSuspended).toBe(false);
    expect(p1.battleArea.includes(foe)).toBe(false);
    expect(p1.hand.some((c) => c.instanceId === foe.topCard?.instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("turn-start seam (2nd card): BT2-032 gains 1 memory when the Active-phase unsuspend flips it", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;

    const target = digimon(0, 11000, "BT2-032");
    target.isSuspended = true;
    p0.battleArea.push(target);
    await recomputeContinuous(s); // install BT2-032's "[Your Turn] when this becomes unsuspended" watcher
    const memoryBefore = s.state.memory; // no card play here — no memory-cost confound

    await unsuspendForActivePhase(s, 0);
    await settle(() => s.state.memory !== memoryBefore);

    expect(target.isSuspended).toBe(false);
    expect(s.state.memory).not.toBe(memoryBefore);
    assertNoLoudGap(s);
  });

  it("＜Reboot＞ seam: BT25-060 gains Piercing + Blocker when it unsuspends on the opponent's Active phase", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;
    const target = digimon(1, 12000, "BT25-060");
    target.isSuspended = true;
    p1.battleArea.push(target);
    // Derive the ＜Reboot＞ keyword AND install BT25-060's "[All Turns] when this gets linked
    // or unsuspends" watcher before consulting either.
    await recomputeContinuous(s);
    expect(ledger(s).hasKeyword(target.permanentId, "Reboot")).toBe(true);

    // Turn player is seat 0; seat 1's ＜Reboot＞ Digimon unsuspends via unsuspendRebootForSeat.
    await unsuspendForActivePhase(s, 0);
    await settle(() => !target.isSuspended);
    await settle(() => hasPierce(s, target.permanentId));

    expect(target.isSuspended).toBe(false);
    expect(hasPierce(s, target.permanentId)).toBe(true);
    expect(ledger(s).hasKeyword(target.permanentId, "Blocker")).toBe(true);
    assertNoLoudGap(s);
  });

  describe("negative controls (the opposite-event trap)", () => {
    it("an already-unsuspended Digimon does not fire when an effect 'unsuspends' it again", async () => {
      const s = setup({ autoSelectCards: true });
      const p0 = s.state.players[0] as PlayerState;
      const p1 = s.state.players[1] as PlayerState;

      const target = digimon(0, 12000, "BT11-032");
      target.isSuspended = false; // already unsuspended — KB BT2-002 Q993: no transition, no fire
      p0.battleArea.push(target);
      const foe = digimon(1, 1000, "BT1-009"); // level 3 — would be returned if the watcher fired
      p1.battleArea.push(foe);
      await recomputeContinuous(s);

      const source = instance("EX7-019", 0, false); // targets target (the only mine-Digimon candidate)
      p0.hand.push(source);
      s.state.memory = 5;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
        ok: true,
      });
      await settle(() => false, 40); // flush resolution; nothing to wait FOR (that's the point)

      expect(target.isSuspended).toBe(false); // unchanged — was already unsuspended
      expect(p1.battleArea.includes(foe)).toBe(true); // NOT returned — the fire gate on isSuspended held
      assertNoLoudGap(s);
    });

    it("a suspend action does not fire whenUnsuspended", async () => {
      const s = setup({ autoSelectCards: true });
      const p0 = s.state.players[0] as PlayerState;
      const p1 = s.state.players[1] as PlayerState;

      // BT11-032 controlled by the DEFENDER (seat 1) so BT1-070 (played by seat 0) can suspend
      // it as an "opponent's Digimon"; the bystander level<=3 Digimon sits on seat 0's board —
      // BT11-032's OWN "return 1 of MY opponent's level<=3 Digimon" would return it if (and only
      // if) suspending incorrectly fired whenUnsuspended.
      const target = digimon(1, 12000, "BT11-032");
      target.isSuspended = false;
      p1.battleArea.push(target);
      const bystander = digimon(0, 1000, "BT1-009"); // level 3, seat 0 (BT11-032's "opponent")
      p0.battleArea.push(bystander);
      await recomputeContinuous(s);

      const source = instance("BT1-070", 0, false); // Digimon, cost 4, [On Play] Suspend the lone opponent Digimon
      p0.hand.push(source);
      s.state.memory = 4;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
        ok: true,
      });
      await settle(() => target.isSuspended);

      expect(target.isSuspended).toBe(true); // BT1-070 did suspend it
      expect(p0.battleArea.includes(bystander)).toBe(true); // NOT returned — suspending must never fire whenUnsuspended
      assertNoLoudGap(s);
    });
  });
});
