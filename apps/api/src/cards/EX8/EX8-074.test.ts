import { describe, it, expect } from "vitest";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for EX8-074 (MedievalGallantmon) — self ＜would be played＞ cost reduction.
//   "When this card would be played, by suspending 2 Digimon, reduce the play cost by 4."
//
// The runtime record compiled this as an inert `wouldBePlayed reduceCost` replacement (the play path
// only honored BeforePayCost / playCostDelta). The fix runs self-targeted `wouldBePlayed`
// reducers in the pay-time window.
//
// FAILS-WHEN-REVERTED: without the reducer the optional is never offered, nothing is suspended, and
// the FULL cost (11) is paid — memory would be 7 → -4 and the two Digimon stay unsuspended. The
// asserted "memory 0 + both suspended" goes RED.

const EX8_074 = "EX8-074"; // cost 11
const VANILLA = "BT1-009"; // a Lv.3 Digimon to suspend as the cost

describe("EX8-074 ＜when played＞ cost reduction (suspend 2 → -4)", () => {
  it("plays at cost 7 (11 - 4), suspending 2 Digimon as the cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: VANILLA, dp: 3000, as: "d1" },
            { card: VANILLA, dp: 3000, as: "d2" },
          ],
          hand: [{ card: EX8_074, as: "medieval" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    s.state.memory = 7; // exactly the reduced cost

    const res = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("medieval").instanceId });
    expect(res).toEqual({ ok: true });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === EX8_074) && s.state.memory === 0);

    expect(p0.battleArea.some((p) => p.topCard?.cardId === EX8_074)).toBe(true);
    // The two Digimon were suspended to pay the reduction cost.
    expect(s.perm("d1").isSuspended).toBe(true);
    expect(s.perm("d2").isSuspended).toBe(true);
    // Reduced cost 7 paid from memory 7 → 0 (NOT the full 11, which would leave -4).
    expect(s.state.memory).toBe(0);
  });
});
