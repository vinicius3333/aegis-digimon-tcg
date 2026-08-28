import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import type { Primitives } from "./effects/EffectContext.js";
// Self-register every compiled-IR card module (so real definitions resolve in the deck).
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, type EngineSetup } from "./testkit/harness.js";

/**
 * A3 for the whenAddSecurity SubTrigger event seam (the counterpart to whenSecurityRemoved).
 *
 * documented behavior EffectTiming.OnAddSecurity (documented behavior IAddSecurity.AddSecurity ~:5522) fires
 * "when security cards are added" — for ANY card added to the security stack, regardless of
 * face (a separate OnFaceUpSecurityIncreased path covers the face-up-only subset). BT23-083
 * (missing-primitive-flags.json) prints "placed face up" but its compiled effect checks
 * EffectTiming.OnAddSecurity (documented behavior), so the engine seam is "a card was added to
 * security". This drives the REAL recoverToSecurity primitive (＜Recovery＞ places the top of
 * the deck onto security) through the engine and asserts an armed whenAddSecurity watcher's
 * body runs — exactly mirroring the whenAttacking / whenSecurityRemoved synthetic-watcher A3s.
 *
 * FAILS-WHEN-REVERTED: removing the fireSubTrigger("whenAddSecurity", …) call at the
 * recoverToSecurity seam (primitives.ts) means the armed watcher never runs, so fireCount
 * stays 0 and the "fires exactly once" assertion goes RED.
 */

/** Access the production effect primitives bound to this match (the real recoverToSecurity). */
function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("whenAddSecurity SubTrigger event — fires when a card is added to security", () => {
  it("an armed whenAddSecurity watcher's body runs when recoverToSecurity adds a card", async () => {
    // A real on-field permanent so the watcher's anchor survives the fireSubTrigger anchor
    // check (a watcher whose source permanent has left the field is skipped). The deck card
    // ＜Recovery＞ will move onto seat 0's security.
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "watcherPerm" }], deck: ["BT1-009"] },
    });
    const p0 = s.state.players[0] as PlayerState;

    // Arm a synthetic whenAddSecurity watcher anchored on the on-field permanent.
    let fireCount = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenAddSecurity",
      sourcePermanentId: s.perm("watcherPerm").permanentId,
      once: false,
      run: async () => {
        fireCount += 1;
      },
      description: "test: count whenAddSecurity fires",
    });

    // Drive the REAL production security-insertion primitive (＜Recovery +1 (Deck)＞).
    // Awaited: the whenAddSecurity watcher body now runs WITHIN this await (WR-01), so its
    // effects are sequenced before control returns — no microtask-flush dance needed.
    const moved = await primitivesOf(s).recoverToSecurity(0, 1);

    expect(moved.length).toBe(1); // the card actually moved onto security
    expect(p0.security.length).toBe(1);
    // FAILS-WHEN-REVERTED: drop the fireSubTrigger("whenAddSecurity", …) at the
    // recoverToSecurity seam => fireCount stays 0 and this goes RED.
    expect(fireCount).toBe(1);
  });

  it("does NOT fire when no card is actually added from an empty deck", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", dp: 3000, as: "watcherPerm" }],
        security: 5,
        deck: [],
      },
    });

    let fireCount = 0;
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenAddSecurity",
      sourcePermanentId: s.perm("watcherPerm").permanentId,
      once: false,
      run: async () => {
        fireCount += 1;
      },
      description: "test: count whenAddSecurity fires (cap-full control)",
    });

    const moved = await primitivesOf(s).recoverToSecurity(0, 1);

    expect(moved.length).toBe(0);
    expect(fireCount).toBe(0); // no add => the event must not fire
  });

  it("the watcher body is sequenced WITHIN the awaited add, not detached after it (WR-01)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "watcherPerm" }], deck: ["BT1-009"] },
    });

    // Record interleaving: the watcher body pushes "watcher"; the caller pushes "after-await"
    // once recoverToSecurity resolves. With the fire AWAITED the watcher body completes before
    // the primitive returns, so "watcher" precedes "after-await". A detached `void` fire would
    // run the body in a later microtask, landing "after-await" first.
    const order: string[] = [];
    advance(s.engine).ledgers.subTriggers.subscribe({
      event: "whenAddSecurity",
      sourcePermanentId: s.perm("watcherPerm").permanentId,
      once: false,
      run: async () => {
        // A real watcher body yields across SEVERAL microtasks (it can prompt a decision and
        // await its response). The awaited seam awaits this whole chain; a detached `void` fire
        // would let the caller's await resolve first, after only the primitive's own single hop.
        for (let i = 0; i < 5; i++) await Promise.resolve();
        order.push("watcher");
      },
      description: "test: whenAddSecurity ordering",
    });

    await primitivesOf(s).recoverToSecurity(0, 1);
    order.push("after-await");

    // FAILS-WHEN-REVERTED: change the seam back to `void engine.fireSubTrigger?.(...)` => the
    // watcher body runs in a detached microtask and "after-await" lands first => RED.
    expect(order).toEqual(["watcher", "after-await"]);
  });
});
