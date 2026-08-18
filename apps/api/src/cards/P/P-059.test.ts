import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./P-059.js";

describe("P-059 Gammamon", () => {
  it("gives its host +2000 DP during your turn while Hiro is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-062" },
          { card: "BT9-023", as: "host", under: ["P-059"] },
        ],
      },
    });
    const printedDP = s.perm("host").baseDP;
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(printedDP + 2000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(printedDP);
  });

  it("does not give +2000 DP without Hiro Amanokawa", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-023", as: "host", under: ["P-059"] }] } });
    const printedDP = s.perm("host").baseDP;
    await s.ready();

    expect(s.perm("host").currentDP).toBe(printedDP);
  });
});
