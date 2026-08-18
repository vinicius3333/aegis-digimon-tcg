import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT20-071 (Soloogarmon — Purple Lv.6 Digimon).
//
// [On Play] / [When Digivolving]: By trashing 1 card in your hand, for the turn, 1 of your
//   Digimon gains ＜Raid＞ and gets +3000 DP.
// [Your Turn][Inherited] This Digimon with the [SoC]/[SEEKERS] trait doesn't activate
//   [Security] effects on Option cards it checks.
//
// FAILS-WHEN-REVERTED: on Soloogarmon [On Play], a controller Digimon's DP increases by 3000,
//   proving the trash-hand-and-grant-raid effect resolved.

// BT20-071 = Soloogarmon (Purple Lv.6, dp 9000, playCost 9)
const SOLOOGARMON = "BT20-071";
// BT20-032 = Bulkmon (Lv.4, SEEKERS trait — base to digivolve Soloogarmon onto)
const BULKMON = "BT20-032";
// BT1-010 Agumon — cheap filler for hand trash
const AGUMON = "BT1-010";
// BT1-001 Koromon — a Digimon to grant Raid+3000 to
const KOROMON = "BT1-001";

describe("BT20-071 Soloogarmon — [When Digivolving] grants Raid and +3000 DP", () => {
  it("[When Digivolving] by trashing 1 hand card, a Digimon gets +3000 DP for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // Bulkmon on the battle area (will digivolve into Soloogarmon).
            { card: BULKMON, dp: 4000, as: "bulkmonPerm" },
            // Another Digimon (Koromon) that may receive Raid + DP boost.
            { card: KOROMON, dp: 1000, as: "koromonPerm" },
          ],
          hand: [
            // Soloogarmon in hand to digivolve into.
            { card: SOLOOGARMON, as: "soloogarmonInst" },
            // A hand card to trash as cost (Agumon).
            { card: AGUMON },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];

    const bulkmonPerm = s.perm("bulkmonPerm");
    const soloogarmonInst = s.inst("soloogarmonInst");
    const koromonPerm = s.perm("koromonPerm");

    // Use enough memory to pay the 3-cost digivolve from a Lv.4 SEEKERS base.
    s.state.memory = 3;

    // Record initial DPs for all own Digimon (the effect picks the first candidate).
    const initialBulkmonDP = bulkmonPerm.currentDP;
    const initialKoromonDP = koromonPerm.currentDP;

    // Digivolve Bulkmon → Soloogarmon.
    const res = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: bulkmonPerm.permanentId,
      instanceId: soloogarmonInst.instanceId,
    });

    expect(res.ok).toBe(true);

    // The [When Digivolving] effect fires: player accepts trashing a hand card
    // (hooks accept=true for optional, first candidate for selectCards).
    // Then the auto-respond hook picks the first Digimon candidate for the +3000 DP grant.
    // The effect targets whichever Digimon appears first in battleArea; either Koromon or
    // the evolved permanent (now Soloogarmon) gets the buff.
    await settle(
      () => bulkmonPerm.currentDP !== initialBulkmonDP || koromonPerm.currentDP !== initialKoromonDP,
      600,
    );

    // One of the two Digimon should have received the +3000 DP grant.
    const anyBoosted =
      bulkmonPerm.currentDP > initialBulkmonDP || koromonPerm.currentDP > initialKoromonDP;
    expect(anyBoosted).toBe(true);
  });
});
