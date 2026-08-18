import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-008.js";

describe("BT5-008 Gaossmon", () => {
  it("gives every other Gaossmon +3000 DP on its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-008", as: "source" }, { card: "BT5-008", as: "other-a" }, { card: "BT5-008", as: "other-b" }] } });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("source").currentDP).toBe(s.perm("source").baseDP + 6000);
    expect(s.perm("other-a").currentDP).toBe(s.perm("other-a").baseDP + 6000);
    expect(s.perm("other-b").currentDP).toBe(s.perm("other-b").baseDP + 6000);
  });

  it("prevents the opponent from reducing digivolution costs on their turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-008", as: "source" }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect((s.engine as any).continuous.blocksCostReduction(1, "digivolve")).toBe(true);
    expect((s.engine as any).continuous.blocksCostReduction(0, "digivolve")).toBe(false);
  });
});
