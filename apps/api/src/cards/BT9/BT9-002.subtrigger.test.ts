import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-002.js";
import { advance } from "../../engine/testkit/advance.js";

// A3 for BT9-002's inherited [Your Turn][Once Per Turn] SubTrigger clause: "when an effect
// adds a card to your hand, this Digimon gets +1000 DP for the turn."
//
// This exercises the REAL IR-compiled dispatch path (interpreter.ts's runSubTrigger gates via
// the "whenEffectAddsToHand" event), not a mocked subscribeSubTrigger.
//
// FAILS-WHEN-REVERTED: revert the event string back to the dead "whenCardAddedToHand" (no fire
// site) — nothing ever calls fireSubTrigger with that name — or delete `effectAddsToHandGate`
// from interpreter.ts => the DP grant never fires => RED.
//
// Uses an effect-driven returnToHand (not the normal draw-phase draw, which does NOT fire
// whenEffectAddsToHand — KB Q1794/Q1795 scope this to effect-driven hand additions only) as the
// fire seam, mirroring the BT16-011 proof's use of the same primitive. The clause is
// [Inherited], so BT9-002 must be BURIED under a host permanent to activate at all
// (placement-guard convention: an inherited effect's source must not be the top card).

describe("BT9-002 whenEffectAddsToHand -> +1000 DP for the turn", () => {
  it("an effect-driven returnToHand fires the watcher and grants +1000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-028", dp: 5000, as: "host", under: [{ card: "BT9-002", as: "bt9002" }] },
        ],
        trash: [{ card: "BT1-028", as: "trashedCard" }],
      },
    });

    const perm = s.perm("host");
    const baseline = perm.currentDP;
    const trashedInstanceId = s.inst("trashedCard").instanceId;

    await advance(s.engine).verb.returnToHand([trashedInstanceId]);
    await settle(() => perm.currentDP !== baseline, 40);

    expect(perm.currentDP).toBe(baseline + 1000);
  });

  it("does NOT fire for the OPPONENT's hand addition (seat-direction control)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-028", dp: 5000, as: "host", under: [{ card: "BT9-002", as: "bt9002" }] },
        ],
      },
      1: {
        trash: [{ card: "BT1-028", as: "oppTrashedCard" }],
      },
    });

    const perm = s.perm("host");
    const baseline = perm.currentDP;
    const trashedInstanceId = s.inst("oppTrashedCard").instanceId;

    await advance(s.engine).verb.returnToHand([trashedInstanceId]);
    await settle(() => true, 20);

    expect(perm.currentDP).toBe(baseline);
  });
});
