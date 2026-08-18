import { describe, expect, it } from "vitest";
import { DpDeleteBudgetLedger } from "./dpDeleteBudget.js";

describe("DpDeleteBudgetLedger", () => {
  it("accumulates per-source-permanent bonuses (stacks multiple adds)", () => {
    const ledger = new DpDeleteBudgetLedger();
    ledger.add("P1", 3000);
    ledger.add("P1", 2000);
    expect(ledger.bonusFor("P1")).toBe(5000);
  });

  it("keeps separate source permanents isolated (no cross-match leak)", () => {
    const ledger = new DpDeleteBudgetLedger();
    ledger.add("P1", 3000);
    expect(ledger.bonusFor("P2")).toBe(0);
  });

  it("returns 0 for a source permanent with no recorded bonus", () => {
    const ledger = new DpDeleteBudgetLedger();
    expect(ledger.bonusFor("unknown")).toBe(0);
  });

  it("clear() drops every accumulated bonus (the continuous-recompute reset)", () => {
    const ledger = new DpDeleteBudgetLedger();
    ledger.add("P1", 3000);
    ledger.clear();
    expect(ledger.bonusFor("P1")).toBe(0);
  });
});
