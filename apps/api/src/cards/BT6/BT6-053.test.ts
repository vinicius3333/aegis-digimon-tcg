import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-053.js";

describe("BT6-053 Eldradimon", () => {
  it("has Security Attack +1 and prevents effect DP reduction on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT6-053", as: "eldradimon" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("eldradimon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).isRestricted(s.perm("eldradimon"), "dpImmune")).toBe(true);
  });
});
