import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-003.js";

describe("BT2-003 Nyaromon", () => {
  it("gives all of its owner's Security Digimon +1000 DP on the opponent's turn while its host is suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-034", as: "host", under: ["BT2-003"], suspended: true }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(0)).toBe(1000);
    expect(observe(s.engine).securityDp(1)).toBe(0);
  });

  it("does not grant Security DP while the host is active", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-034", as: "host", under: ["BT2-003"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });

  it("does not grant Security DP during its owner's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-034", as: "host", under: ["BT2-003"], suspended: true }] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });

  it("stacks the aura from 2 suspended hosts", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-034", under: ["BT2-003"], suspended: true },
          { card: "BT2-034", under: ["BT2-003"], suspended: true },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(0)).toBe(2000);
  });
});
