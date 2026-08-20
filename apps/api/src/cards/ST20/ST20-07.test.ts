import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST20-07.js";

describe("ST20-07 Tentomon", () => {
  it("blocks only the opponent's digivolution cost reductions during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST20-07", as: "tentomon" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const ledger = (
      s.engine as unknown as {
        continuous: { blocksCostReduction: (seat: number, costType: "play" | "digivolve") => boolean };
      }
    ).continuous;
    expect(ledger.blocksCostReduction(1, "digivolve")).toBe(true);
    expect(ledger.blocksCostReduction(0, "digivolve")).toBe(false);
    expect(ledger.blocksCostReduction(1, "play")).toBe(false);
  });
});
