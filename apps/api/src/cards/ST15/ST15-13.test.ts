import { describe, it, expect } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for ST15-13 (HiAndromon) — two effects:
//   (1) ＜Blocker＞ static keyword (continuous, while on battle area).
//   (2) [When Digivolving] Delete 1 of your opponent's Digimon with a play cost of 8 or less.
//       source: documented behavior.
//
// FAILS-WHEN-REVERTED:
//   (1) The Blocker keyword is granted via the static modifier; without it the ledger
//       records no Blocker → the hasKeyword assertion fails.
//   (2) The delete effect removes the target; without it the target remains on the field.

interface LedgerReader {
  hasKeyword(permanentId: string, keyword: string): boolean;
}

function ledgerOf(s: EngineSetup): LedgerReader {
  return (s.engine as unknown as { continuous: LedgerReader }).continuous;
}

// ST15-13 is a Black Lv.6 Digimon that digivolves from a Black Lv.5.
// BT10-064 Gogmamon — Black Lv.5, playCost 5, evoCosts [{color:"Black",level:4,memoryCost:3}].
// Opponent target: BT1-009 Monodramon — Red Lv.3, playCost 2 (≤ 8 → eligible for deletion).
const HIANDROMON = "ST15-13";
const LV5_BASE = "BT10-064"; // Black Lv.5 — a valid digivolution base for ST15-13
const TARGET_LV3 = "BT1-009"; // opponent Digimon, playCost 2 (≤ 8)

describe("ST15-13 <Blocker> static keyword", () => {
  it("grants ＜Blocker＞ on the battle area via the static modifier", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: HIANDROMON, dp: 12000, as: "hia" }] } });

    await s.engine.recomputeContinuousEffects();

    expect(ledgerOf(s).hasKeyword(s.perm("hia").permanentId, "Blocker")).toBe(true);
  });

  it("does NOT grant ＜Blocker＞ when ST15-13 is not on the battle area", async () => {
    // ST15-13 never placed on the battle area — nothing to grant Blocker on.
    // Verify no phantom grants by checking that a fresh permanent with a non-ST15-13 card
    // has no Blocker (baseline sanity).
    const s = setupEngine({ 0: { battleArea: [{ card: LV5_BASE, dp: 6000, as: "other" }] } });
    await s.engine.recomputeContinuousEffects();

    expect(ledgerOf(s).hasKeyword(s.perm("other").permanentId, "Blocker")).toBe(false);
  });
});

describe("ST15-13 [When Digivolving] delete opponent Digimon with play cost ≤ 8", () => {
  it("deletes the opponent's eligible Digimon after digivolving onto a Lv.5 base", async () => {
    const s = setupEngine(
      {
        // Set up a Lv.5 Black Digimon on seat-0 as the digivolution base.
        0: { battleArea: [{ card: LV5_BASE, dp: 6000, as: "base" }], hand: [{ card: HIANDROMON, as: "card" }] },
        // Opponent has a Lv.3 Digimon with playCost 2 (≤ 8 → valid target).
        1: { battleArea: [{ card: TARGET_LV3, dp: 3000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const base = s.perm("base");
    const target = s.perm("target");
    const targetPermanentId = target.permanentId;
    const targetTopId = target.topCard!.instanceId;
    s.state.memory = 10; // enough for the evo cost

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.inst("card").instanceId,
    });
    expect(result).toEqual({ ok: true });

    await settle(() => p1.trash.some((c) => c.instanceId === targetTopId));

    expect(p1.trash.some((c) => c.instanceId === targetTopId)).toBe(true);
    expect(p1.battleArea.some((p) => p.permanentId === targetPermanentId)).toBe(false);
  });

  it("deletes a play-cost-8 Digimon but never the play-cost-10 Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: LV5_BASE, dp: 6000, as: "base" }], hand: [{ card: HIANDROMON, as: "card" }] },
        1: {
          battleArea: [
            { card: "BT24-038", dp: 8000, as: "exactCost" },
            { card: "BT10-013", dp: 8000, as: "highCost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    const base = s.perm("base");
    const exactCost = s.perm("exactCost");
    const highCost = s.perm("highCost");
    const exactCostTopId = exactCost.topCard!.instanceId;
    const highCostPermanentId = highCost.permanentId;
    const highTopId = highCost.topCard!.instanceId;
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: s.inst("card").instanceId,
    });
    expect(result).toEqual({ ok: true });

    await settle(() => p1.trash.some((c) => c.instanceId === exactCostTopId));

    expect(p1.battleArea.some((p) => p.permanentId === exactCost.permanentId)).toBe(false);
    expect(p1.trash.some((c) => c.instanceId === exactCostTopId)).toBe(true);
    expect(p1.battleArea.some((p) => p.permanentId === highCostPermanentId)).toBe(true);
    expect(p1.trash.some((c) => c.instanceId === highTopId)).toBe(false);
  });
});
