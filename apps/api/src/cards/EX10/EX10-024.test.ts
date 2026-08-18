import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for EX10-024 (Kabemon) — [When Attacking] by trashing 1 of this Digimon's LINK cards,
// <De-Digivolve 1> 1 of your opponent's Digimon. source: documented behavior.
//
// FAILS-WHEN-REVERTED: a real link card is trashed (fx.trash, not TrashDigivolution) and the
// chosen opponent Digimon loses a digivolution card (De-Digivolve). A no-op leaves both intact.
//
// The Advance Surface's `advance().fire()` cannot express this: it forwards a `Permanent` as
// the fire's TriggerInfo instead of `{ attackerPermanentId }`, and the interpreter reads
// `ctx.trigger.attackerPermanentId` directly (src/engine/effects/interpreter.ts) to gate a
// [When Attacking] effect onto the attacking permanent — so this test keeps the direct
// `fireTiming` reach-through the pre-migration file used.

describe("EX10-024 [When Attacking] trash 1 link card → De-Digivolve 1 opponent Digimon", () => {
  it("trashes a link card and de-digivolves the chosen opponent Digimon", async () => {
    // EX10-024's [When Attacking][Linked] effect is active while EX10-024 is a LINK card under an
    // attacking host (isLinked → the placement guard requires it in the host's linked list).
    // The host must satisfy EX10-024's own printed link requirement ("[Appmon] trait"), or the
    // §17-1-3-2-6 rule check trashes the link card before the effect can ever fire.
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-041", dp: 1000, as: "host", linked: [{ card: "EX10-024", as: "kabemonLink" }] }] },
        1: { battleArea: [{ card: "BT1-009", dp: 5000, as: "oppTarget", under: ["BT1-009", "BT1-009"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    const host = s.perm("host");
    const kabemonLink = s.inst("kabemonLink");
    const oppTarget = s.perm("oppTarget");
    const oppStackBefore = oppTarget.stack.length;

    await s.engine.recomputeContinuousEffects();
    await (s.engine as unknown as {
      fireTiming: (t: EffectTiming, trigger?: Record<string, unknown>) => Promise<void>;
    }).fireTiming(EffectTiming.OnAllyAttack, { attackerPermanentId: host.permanentId });
    // Predicate on the FINAL state only: `host.linked.length === 0` becomes true one step
    // earlier (the trash) and would let the run exit before <De-Digivolve> resolves.
    await settle(() => oppTarget.stack.length < oppStackBefore);

    // A link card was trashed (real fx.trash) and the opponent Digimon lost a digivolution card.
    expect(host.linked.length).toBe(0);
    expect(p0.trash.some((c) => c.instanceId === kabemonLink.instanceId)).toBe(true);
    expect(oppTarget.stack.length).toBe(oppStackBefore - 1);
  });
});
