import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-021.js";

describe("BT5-021 Syakomon", () => {
  it("prevents the opponent from reducing digivolution costs on their turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-021", as: "syakomon" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect((s.engine as any).continuous.blocksCostReduction(1, "digivolve")).toBe(true);
    expect((s.engine as any).continuous.blocksCostReduction(0, "digivolve")).toBe(false);
    expect((s.engine as any).continuous.blocksCostReduction(1, "play")).toBe(false);
  });
});
