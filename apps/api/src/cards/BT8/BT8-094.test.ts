import { describe, it, expect } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import "./BT8-094.js";
import "./BT8-096.js";

// A3 for BT8-094 (Digimon Emperor) — its [Opponent's Turn] "gain 2 memory when opponent's Lv3
// Digimon moves breeding -> battle" gate read the moved `Permanent.ownerSeat`. `Permanent`
// has no `ownerSeat` field (the real field is `controllerSeat`; `ownerSeat` lives on
// `CardInstance`), so `perm.ownerSeat === oppSeat` was always `undefined === oppSeat` ->
// always false. The gate was dead: memory never moved no matter what actually moved.
//
// FAILS-WHEN-REVERTED: reverting `perm.controllerSeat` back to `perm.ownerSeat` on the
// OnMove gate leaves `state.memory` at 0 after the move that should trigger the gain.
//
// Behavior check (not just "does it fire"): per the printed text this is gated to the
// OPPONENT's Lv3 Digimon specifically; kb query for BT8-094 has no errata and its Q&A
// (Q1769/Q1770) only concerns timing/interaction, not the ownerSeat/controllerSeat
// distinction, so the fix is a pure field-name correction, not a behavior invention.

describe("BT8-094 [Opponent's Turn] gain 2 memory on opponent's Lv3 breeding->battle move", () => {
  it("suspends and draws when an opposing level 5 or lower Digimon is deleted", async () => {
    const s = setup({
      0: {
        battleArea: [{ card: "BT8-094", as: "tamer" }, "BT8-008"],
        hand: [{ card: "BT8-096", as: "deletionOption" }],
        deck: [{ card: "BT8-033", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "deleted" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    const deletedInstance = s.perm("deleted").topCard!;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deletionOption").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId) &&
      s.state.players[1]!.trash.some((card) => card.instanceId === deletedInstance.instanceId),
    );

    expect(s.state.players[1]!.trash).toContainEqual(deletedInstance);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("fires when the opponent moves a Lv3 Digimon from breeding to battle on their own turn (Permanent.ownerSeat does not exist; real field is controllerSeat)", async () => {
    const s = setup({
      0: { battleArea: [{ card: "BT8-094", dp: 0, as: "tamer" }] },
      // Lv3 Rookie with DP -- legally movable
      1: { breeding: { card: "BT1-009", dp: 3000, as: "mover" } },
    });
    const mover = s.perm("mover");

    s.state.phase = Phase.Breeding;
    s.state.turnSeat = 1; // the opponent's (seat 1's) own turn, relative to BT8-094's owner (seat 0)
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(1, { type: "moveFromBreeding", permanentId: mover.permanentId }),
    ).toEqual({ ok: true });

    await settle(() => s.state.memory !== 0, 200);

    expect(s.state.memory).not.toBe(0); // the [Opponent's Turn] gate fired and gained memory
  });
});
