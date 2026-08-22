import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-038.js";

describe("BT5-038 Kyubimon", () => {
  it("gives all opposing Security Digimon -1000 DP on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-039", as: "host", under: ["BT5-038"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(1)).toBe(-1000);
    expect(observe(s.engine).securityDp(0)).toBe(0);
  });

  it("does not apply the inherited security reduction on the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-039", as: "host", under: ["BT5-038"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(1)).toBe(0);
  });
});
