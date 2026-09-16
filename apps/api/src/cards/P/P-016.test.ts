import { describe, it, expect } from "vitest";
import { setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

interface LedgerReader {
  hasKeyword(permanentId: string, keyword: string): boolean;
  grantedKeywords(permanentId: string): { keyword: string; amount?: number }[];
}

function ledgerOf(s: EngineSetup): LedgerReader {
  return (s.engine as unknown as { continuous: LedgerReader }).continuous;
}

describe("P-016 [Your Turn] <Security Attack +N> per Diaboromon in battle area", () => {
  it("gains SecurityAttack +1 when P-016 itself is the only Diaboromon (KB Q4128: self-counts)", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-016", dp: 9000, as: "p016" }] } });

    await s.engine.recomputeContinuousEffects();

    const p016 = s.perm("p016");
    const ledger = ledgerOf(s);
    expect(ledger.hasKeyword(p016.permanentId, "SecurityAttack")).toBe(true);
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
    expect(grants[0]!.amount).toBe(2);
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
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    const p016 = s.perm("p016");
    expect(ledgerOf(s).hasKeyword(p016.permanentId, "SecurityAttack")).toBe(false);
  });

  it("does NOT grant SecurityAttack when no Diaboromon is in the battle area", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", dp: 3000, as: "other" }] } });

    await s.engine.recomputeContinuousEffects();

    const other = s.perm("other");
    expect(ledgerOf(s).hasKeyword(other.permanentId, "SecurityAttack")).toBe(false);
  });
});
