import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./P-013.js";

describe("P-013 Keramon", () => {
  it("gives its host +1000 DP only during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-016", as: "host", under: ["P-013"] }] },
    });
    await s.ready();
    const printedDP = 11_000;

    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(printedDP);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(printedDP + 1000);
  });
});
