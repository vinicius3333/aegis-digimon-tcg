import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST14-04.js";

describe("ST14-04 Phascomon", () => {
  it("has Blocker and can't attack players on its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST14-04", as: "phas" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("phas"), "Blocker")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("phas"), "attackPlayers")).toBe(true);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).isRestricted(s.perm("phas"), "attackPlayers")).toBe(false);
  });
});
