import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT17-048 (Argomon, Green Lv.5):
//   [On Deletion] If 4+ [Argomon] in trash, may play 1 Lv.6 [Argomon] from hand for free.
//   KB Q2800: the count is checked AFTER this card is sent to trash (so it counts itself).
//
// FAILS-WHEN-REVERTED: the [On Deletion] clause was in residual (RawUnparsed) in the stub.
// The test proves the [On Deletion] fires and a Lv.6 Argomon can be played from hand.
// We also verify KB Q2800: with 3 Argomon in trash before deletion, the card itself
// counts → 4 total → condition met.

const ARGOMON_LV5 = "BT17-048";

// We need a Lv.6 Argomon card. BT17-050 doesn't exist; use a placeholder.
// The engine checks nameEn === "Argomon" && level === 6.
// Use "BT17-054" which should be a higher-level Argomon if it exists, otherwise use
// BT17-048 itself as the play target (we need a DIFFERENT level-6 Argomon).
// Let's check what Argomon L6 cards exist in the set.
// Looking at BT17 cards, the Lv.6 Argomon is BT17-051 (Green Lv.6 Digimon "Argomon").
const ARGOMON_LV6 = "BT17-051";

describe("BT17-048 Argomon — [On Deletion] play Lv.6 Argomon (KB Q2800)", () => {
  it("prevents all opposing Tamers from unsuspending during the opponent's turn", async () => {
    const { compiled } = await import("./BT17-048.js");
    expect(compiled.effects.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({ kind: "Restrict", target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: "all" }, restriction: "unsuspend", duration: "untilOpponentTurnEnd" });
  });

  it("with 3 Argomon in trash before deletion, the deleted card counts → 4 total, condition met", async () => {
    // Put 3 Argomon in trash (they count toward the threshold).
    // Put a Lv.6 Argomon in hand.
    // Set up the Argomon Lv.5 on the field so it can be deleted.
    // We need an opponent digivolve to trigger BT17-010 (Growlmon) [When Digivolving]
    // which deletes opponent Digimon with ≤4000 DP.
    // BT1-009 (Monodramon) is Lv.3 Red — valid base for Growlmon (Lv.4, evo from Lv.3 Red, cost 2).
    const s = setupEngine(
      {
        0: {
          trash: [ARGOMON_LV5, ARGOMON_LV5, ARGOMON_LV5],
          hand: [{ card: ARGOMON_LV6, as: "lv6Argomon" }],
          battleArea: [{ card: ARGOMON_LV5, dp: 3000, as: "argomon" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", dp: 1000, as: "oppBase" }],
          hand: [{ card: "BT17-010", as: "growlmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;

    expect(p0.trash).toHaveLength(3);

    const argomonPermId = s.perm("argomon").permanentId;
    const lv6ArgomonId = s.inst("lv6Argomon").instanceId;
    const oppBasePermId = s.perm("oppBase").permanentId;
    const growlmonId = s.inst("growlmon").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 5;

    const res = s.engine.applyIntent(1, {
      type: "digivolve",
      instanceId: growlmonId,
      permanentId: oppBasePermId,
    });
    expect(res.ok).toBe(true);

    await settle(
      () => {
        // Wait until: Argomon no longer in battle area.
        const argomonInField = p0.battleArea.some((perm) => perm.permanentId === argomonPermId);
        return !argomonInField;
      },
      600,
    );

    // Argomon was deleted — KB Q2800: the 4 in trash (3 pre-existing + 1 just deleted)
    // should trigger the [On Deletion] to offer playing the Lv.6 Argomon.
    // With auto-accept, the Lv.6 Argomon should be on the field.
    await settle(
      () => {
        const lv6InField = p0.battleArea.some((perm) => perm.topCard?.cardId === ARGOMON_LV6);
        const lv6InHand = p0.hand.some((c) => c.instanceId === lv6ArgomonId);
        return lv6InField || !lv6InHand;
      },
      600,
    );

    const lv6IsOnField = p0.battleArea.some((perm) => perm.topCard?.cardId === ARGOMON_LV6);
    expect(lv6IsOnField).toBe(true);
  });
});
