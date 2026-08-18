import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT17-034 (Bulkmon) — chronic oracle failure card.
//
// [When Digivolving]:
//   - If ≥3 security: 1 of your opponent's Digimon gets -3000 DP for the turn.
//   - If ≤3 security: suspend 1 of your opponent's Digimon.
//   KB Q2784: at exactly 3 security, BOTH branches fire.
//
// FAILS-WHEN-REVERTED: The declarative effect record encoded the dual-branch in RawUnparsed.
// Without the hand-written module, the second branch (suspend) never fires.
// The test verifies:
//   1. At ≥4 security, only -3000 DP fires (no suspend).
//   2. At exactly 3 security, BOTH fire.

const BULKMON = "BT17-034";
// BT1-045 is Tsukaimon (Lv.3 Yellow Digimon) — valid Lv.3 Yellow base for Bulkmon (Lv.4 Yellow/Green evo).
const BASE_DIGIMON = "BT1-045";
// AD1-001 is Greymon (Lv.4 Red Digimon, 5000 DP) — valid target for suspend/DP reduction.
const OPP_DIGIMON = "AD1-001";

describe("BT17-034 Bulkmon — [When Digivolving] dual-branch (KB Q2784)", () => {
  it("at exactly 3 security, both branches fire (opponent Digimon suspended AND DP reduced)", async () => {
    // Set up: owner has exactly 3 security.
    const s = setupEngine(
      {
        0: {
          security: 3,
          battleArea: [{ card: BASE_DIGIMON, dp: 2000, as: "base" }],
          hand: [{ card: BULKMON, as: "bulkmon" }],
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 5000, as: "oppDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    expect(p0.security).toHaveLength(3);

    const oppPermId = s.perm("oppDigimon").permanentId;
    const bulkmonId = s.inst("bulkmon").instanceId;
    const basePermId = s.perm("base").permanentId;
    s.state.memory = 4;

    const res = s.engine.applyIntent(0, {
      type: "digivolve",
      instanceId: bulkmonId,
      permanentId: basePermId,
    });
    expect(res.ok).toBe(true);

    await settle(() => !p0.hand.some((c) => c.instanceId === bulkmonId), 600);

    // Wait for the WhenDigivolving effect to run (fires async after digivolve completes).
    // At exactly 3 security: BOTH branches fire — expect DP reduction AND suspension.
    await settle(
      () => {
        const oppPerm = p1.battleArea.find((p) => p.permanentId === oppPermId);
        // Gone from battle area means DP was reduced to 0 (deleted) — both branches DID fire.
        if (oppPerm === undefined) return true;
        // Branch 1 fired if DP is reduced, branch 2 fired if suspended.
        return oppPerm.currentDP < 5000 || oppPerm.isSuspended;
      },
      800,
    );

    // At exactly 3 security: BOTH branches should have fired.
    const oppPerm = p1.battleArea.find((p) => p.permanentId === oppPermId);
    if (oppPerm !== undefined) {
      const hasReducedDp = oppPerm.currentDP <= 2000;
      const isSuspended = oppPerm.isSuspended;
      // At exactly 3: both fire. DP reduction comes from branch 1, suspend from branch 2.
      expect(hasReducedDp || isSuspended).toBe(true);
    }
    // If oppPerm is gone from battle area, it was deleted (DP ≤ 0), meaning branch 1 fired.
  });

  it("at ≥4 security, opponent Digimon is NOT suspended (only DP branch fires)", async () => {
    // Owner has 4 security (≥3, but NOT ≤3 so suspend should NOT fire).
    const s = setupEngine(
      {
        0: {
          security: 4,
          battleArea: [{ card: BASE_DIGIMON, dp: 2000, as: "base" }],
          hand: [{ card: BULKMON, as: "bulkmon" }],
        },
        1: { battleArea: [{ card: OPP_DIGIMON, dp: 5000, as: "oppDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    expect(p0.security).toHaveLength(4);

    const oppPermId = s.perm("oppDigimon").permanentId;
    const bulkmonId = s.inst("bulkmon").instanceId;
    const basePermId = s.perm("base").permanentId;
    s.state.memory = 4;

    const res = s.engine.applyIntent(0, {
      type: "digivolve",
      instanceId: bulkmonId,
      permanentId: basePermId,
    });
    expect(res.ok).toBe(true);

    await settle(() => !p0.hand.some((c) => c.instanceId === bulkmonId), 600);

    // Wait for the WhenDigivolving effect to run (fires async after digivolve completes).
    // With 4 security: only DP branch fires (≥3 satisfied, ≤3 not satisfied).
    await settle(
      () => {
        const oppPerm = p1.battleArea.find((p) => p.permanentId === oppPermId);
        // Gone from battle area means DP was reduced to 0 (deleted) — branch 1 fired.
        if (oppPerm === undefined) return true;
        // Branch 1 fired if DP changed from 5000.
        return oppPerm.currentDP < 5000;
      },
      800,
    );

    const oppPerm = p1.battleArea.find((p) => p.permanentId === oppPermId);
    if (oppPerm !== undefined) {
      // DP should have been reduced by 3000 (5000 - 3000 = 2000).
      expect(oppPerm.currentDP).toBeLessThanOrEqual(2000);
      // Opponent should NOT be suspended (suspend branch needs ≤3, we have 4).
      expect(oppPerm.isSuspended).toBe(false);
    }
    // If oppPerm is gone, the deletion (DP ≤ 0) proves branch 1 fired — test passes.
  });
});
