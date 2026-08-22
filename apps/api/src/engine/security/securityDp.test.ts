import { EffectDuration } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { SecurityDpLedger } from "./securityDp.js";

describe("SecurityDpLedger", () => {
  it("sweeps triggered modifiers at their seat-relative turn boundary", () => {
    const ledger = new SecurityDpLedger();
    ledger.add(0, 1000);
    ledger.add(0, 2000, { duration: EffectDuration.UntilOwnerTurnEnd });
    ledger.add(0, 4000, { duration: EffectDuration.UntilOpponentTurnEnd });

    expect(ledger.deltaFor(0)).toBe(7000);
    ledger.sweepTurnEnd(0);
    expect(ledger.deltaFor(0)).toBe(4000);
    ledger.sweepTurnEnd(1);
    expect(ledger.deltaFor(0)).toBe(0);
  });

  it("does not apply security-Digimon modifiers to non-Digimon security cards", () => {
    const ledger = new SecurityDpLedger();
    ledger.add(0, -3000);

    expect(ledger.deltaForCard(0, true)).toBe(-3000);
    expect(ledger.deltaForCard(0, false)).toBe(0);
  });
});
