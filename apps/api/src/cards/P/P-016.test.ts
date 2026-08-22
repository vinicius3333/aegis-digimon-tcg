import { describe, it, expect } from "vitest";
import { setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for P-016 (Diaboromon) — [Your Turn] continuous SecurityAttack scaling:
//   "While you have at least 1 Digimon with [Diaboromon] in its name in your battle
//    area, this Digimon gets <Security Attack +N> where N = that count." (documented behavior)
//
// KB authority:
//   Q4128: this card itself counts as 1 [Diaboromon] for its own effect.
//   Q4127: [Diaboromon] tokens also count.
//
// FAILS-WHEN-REVERTED: drop the staticModifier from P-016.ts — after a
// recomputeContinuousEffects(), the ledger no longer records a SecurityAttack grant
// on P-016's permanent → the "has SecurityAttack" assertion goes RED.

interface LedgerReader {
  hasKeyword(permanentId: string, keyword: string): boolean;
  grantedKeywords(permanentId: string): { keyword: string; amount?: number }[];
}

function ledgerOf(s: EngineSetup): LedgerReader {
  return (s.engine as unknown as { continuous: LedgerReader }).continuous;
}

describe("P-016 [Your Turn] <Security Attack +N> per Diaboromon in battle area", () => {
  it("gains SecurityAttack +1 when P-016 itself is the only Diaboromon (KB Q4128: self-counts)", async () => {
    // Only P-016 itself — counts as 1 Diaboromon (Q4128).
    const s = setupEngine({ 0: { battleArea: [{ card: "P-016", dp: 9000, as: "p016" }] } });

    await s.engine.recomputeContinuousEffects();

    // The static effect grants SecurityAttack on P-016's permanent.
    const p016 = s.perm("p016");
    const ledger = ledgerOf(s);
    expect(ledger.hasKeyword(p016.permanentId, "SecurityAttack")).toBe(true);
    // The amount should be 1 (one Diaboromon in play = count 1).
    const grants = ledger.grantedKeywords(p016.permanentId).filter((g) => g.keyword === "SecurityAttack");
    expect(grants.length).toBeGreaterThan(0);
    expect(grants[0]!.amount).toBe(1);
  });

  it("scales to +2 when there are 2 Diaboromon in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-016", dp: 9000, as: "p016a" },
          { card: "P-016", dp: 9000, as: "p016b" },
        ],
      },
    });

    await s.engine.recomputeContinuousEffects();

    const p016a = s.perm("p016a");
    const grants = ledgerOf(s)
      .grantedKeywords(p016a.permanentId)
      .filter((g) => g.keyword === "SecurityAttack");
    expect(grants.length).toBeGreaterThan(0);
    expect(grants[0]!.amount).toBe(2); // 2 Diaboromon in play → +2
  });

  it("counts a Diaboromon token but not Diaboromon (X Antibody)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-016", as: "p016" },
          { card: "TOKEN-Diaboromon", as: "token" },
          { card: "BT24-065", as: "x-antibody" },
        ],
      },
    });

    await s.engine.recomputeContinuousEffects();

    const grants = ledgerOf(s)
      .grantedKeywords(s.perm("p016").permanentId)
      .filter((grant) => grant.keyword === "SecurityAttack");
    expect(grants[0]!.amount).toBe(2);
  });

  it("does NOT grant SecurityAttack on the opponent's turn (Your Turn gate)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-016", dp: 9000, as: "p016" }] } });
    s.state.turnSeat = 1; // opponent's turn — the [Your Turn] condition fails for seat 0

    await s.engine.recomputeContinuousEffects();

    // Gate fails on opponent's turn — no SecurityAttack grant.
    const p016 = s.perm("p016");
    expect(ledgerOf(s).hasKeyword(p016.permanentId, "SecurityAttack")).toBe(false);
  });

  it("does NOT grant SecurityAttack when no Diaboromon is in the battle area", async () => {
    // A non-Diaboromon Digimon only — count = 0, gate fails.
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "other" }] } });

    await s.engine.recomputeContinuousEffects();

    // Not a P-016 permanent, and no Diaboromon → no SecurityAttack.
    const other = s.perm("other");
    expect(ledgerOf(s).hasKeyword(other.permanentId, "SecurityAttack")).toBe(false);
  });
});
