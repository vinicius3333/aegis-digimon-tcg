import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-014.js";
describe("BT10-014 PileVolcamon", () => {
  it("gains Blitz when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-002", as: "base" }], hand: [{ card: "BT10-014", as: "evolving" }] } }); s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blitz")).toBe(true);
  });

  it("gets +2000 DP only during its owner's turn without stacking on recompute", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-014", as: "pileVolcamon" }] } });

    await s.ready();
    expect(s.perm("pileVolcamon").currentDP).toBe(13_000);

    await advance(s.engine).recompute();
    expect(s.perm("pileVolcamon").currentDP).toBe(13_000);

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("pileVolcamon").currentDP).toBe(11_000);
  });
});
