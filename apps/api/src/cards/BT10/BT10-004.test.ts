import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT10-004.js";

describe("BT10-004 Bosamon", () => {
  it("gives its host +1000 DP once per turn when an effect suspends a Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-054", as: "host", under: ["BT10-004"] },
          { card: "BT10-046", as: "ally" },
        ],
      },
      1: { battleArea: [{ card: "BT10-020", as: "opponent" }] },
    });
    const base = s.perm("host").baseDP;
    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    expect(s.perm("host").currentDP).toBe(base + 1000);

    await advance(s.engine).runTurn(0);
    expect(s.perm("host").currentDP).toBe(base);
  });

  it("arms two copies independently without duplicating either watcher on recompute", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-054", as: "firstHost", under: ["BT10-004"] },
          { card: "BT10-054", as: "secondHost", under: ["BT10-004"] },
          { card: "BT10-046", as: "firstSuspended" },
          { card: "BT10-047", as: "secondSuspended" },
        ],
      },
    });
    const firstBase = s.perm("firstHost").baseDP;
    const secondBase = s.perm("secondHost").baseDP;

    await advance(s.engine).recompute();
    await advance(s.engine).recompute();
    await advance(s.engine).verb.suspend([s.perm("firstSuspended").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("secondSuspended").permanentId]);

    expect(s.perm("firstHost").currentDP).toBe(firstBase + 1000);
    expect(s.perm("secondHost").currentDP).toBe(secondBase + 1000);
  });

  it("does not arm or gain DP during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-054", as: "host", under: ["BT10-004"] },
          { card: "BT10-046", as: "ally" },
        ],
      },
    });
    const base = s.perm("host").baseDP;
    s.state.turnSeat = 1;

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);

    expect(s.perm("host").currentDP).toBe(base);
  });
});
