import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-014.js";
describe("BT6-014 Asuramon", () => {
  it("gains Blitz when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "base" }], hand: [{ card: "BT6-014", as: "evolving" }] },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blitz")).toBe(true);
  });
});
