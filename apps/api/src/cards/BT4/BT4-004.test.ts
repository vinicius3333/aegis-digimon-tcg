import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT4-004.js";
import "./BT4-051.js";
import "./BT4-054.js";

describe("BT4-004 Budmon", () => {
  it("gives +1000 DP to its host while it has Digi-Burst", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-054", as: "host", under: ["BT4-004", "BT4-051"] }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not give DP to a host without Digi-Burst", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-051", as: "host", under: ["BT4-004"] }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not give DP to its host during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-054", as: "host", under: ["BT4-004", "BT4-051"] }] },
    });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
