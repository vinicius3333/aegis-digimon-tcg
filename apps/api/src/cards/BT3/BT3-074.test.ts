import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-074.js";

describe("BT3-074 MetalEtemon", () => {
  it("can't be blocked on its turn and gets +2000 DP on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-074", as: "metalEtemon" }] } });

    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("metalEtemon"), "cantBeBlocked")).toBe(true);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("metalEtemon").currentDP).toBe(s.perm("metalEtemon").baseDP + 2000);
  });
});
