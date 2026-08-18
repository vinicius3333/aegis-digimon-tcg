import { describe, it, expect } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT17-068 (Mephistomon):
//   [On Deletion] You may play 1 [Gulfmon] or 1 level 6 Digimon with [Dark Masters]
//     trait from your hand or trash without paying cost.
//   [Inherited][When Attacking][Once Per Turn] By placing 1 level 5 or lower card with
//     [Dark Masters] in its text from your trash as this Digimon's bottom digivolution
//     card, this Digimon gets +2000 DP for the turn.
//
// FAILS-WHEN-REVERTED: the declarative effect record had both clauses as RawUnparsed no-ops.
// Test proves [On Deletion] plays Gulfmon from hand when Mephistomon is deleted.

const MEPHISTOMON = "BT17-068";
const GULFMON = "BT17-070"; // Gulfmon Lv6 — eligible for [On Deletion]

describe("BT17-068 Mephistomon — [On Deletion] play Gulfmon from hand", () => {
  it("[On Deletion] plays Gulfmon from hand to battle area when Mephistomon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: MEPHISTOMON, dp: 7000, as: "meph" }],
          hand: [{ card: GULFMON, as: "gulfmon" }],
        },
        1: { battleArea: [{ card: "BT1-007", dp: 20000, as: "oppDigimon", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    const mephPermId = s.perm("meph").permanentId;
    const gulfId = s.inst("gulfmon").instanceId;
    const oppDigimonId = s.perm("oppDigimon").permanentId;

    s.state.phase = Phase.Main;
    s.state.turnSeat = 0;

    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: mephPermId,
      target: { kind: "permanent", permanentId: oppDigimonId },
    });
    expect(res.ok).toBe(true);

    // Wait for Mephistomon to leave the battle area (deleted in battle).
    await settle(() => !p0?.battleArea.some((p) => p.permanentId === mephPermId), 1000);

    // Verify Mephistomon was actually deleted (not still alive).
    expect(p0?.battleArea.some((p) => p.permanentId === mephPermId)).toBe(false);

    // Wait for [On Deletion] to resolve (Gulfmon played to battle area).
    await settle(() => p0?.battleArea.some((p) => p.topCard?.cardId === GULFMON) ?? false, 400);

    // Mephistomon was deleted in battle; [On Deletion] fired and played Gulfmon.
    const gulfInBattle = p0?.battleArea.some((p) => p.topCard?.instanceId === gulfId);
    expect(gulfInBattle).toBe(true);
  });
});
