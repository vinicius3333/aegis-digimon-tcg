import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./P-057.js";

describe("P-057 Tyrannomon", () => {
  it("gets +3000 on its turn and gives +2000 only to a level-6-or-higher host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "P-057", as: "tyrannomon" },
          { card: "BT1-080", as: "level6", under: ["P-057"] },
          { card: "BT1-057", as: "level5", under: ["P-057"] },
        ],
      },
    });
    const ownBase = s.perm("tyrannomon").baseDP;
    const level6Base = s.perm("level6").baseDP;
    const level5Base = s.perm("level5").baseDP;
    await s.ready();

    expect(s.perm("tyrannomon").currentDP).toBe(ownBase + 3000);
    expect(s.perm("level6").currentDP).toBe(level6Base + 2000);
    expect(s.perm("level5").currentDP).toBe(level5Base);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("tyrannomon").currentDP).toBe(ownBase);
    expect(s.perm("level6").currentDP).toBe(level6Base);
  });
});
