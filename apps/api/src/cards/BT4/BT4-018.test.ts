import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT4-018.js";

describe("BT4-018 Spinomon", () => {
  it("gets +3000 DP during its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-018", as: "spino" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("spino").currentDP).toBe(13000);
  });

  it("does not get the DP bonus during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-018", as: "spino" }] } });

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("spino").currentDP).toBe(s.perm("spino").baseDP);
  });
});
