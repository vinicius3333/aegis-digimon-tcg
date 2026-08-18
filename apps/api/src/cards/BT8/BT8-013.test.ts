import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-013.js";

describe("BT8-013 BetelGammamon", () => {
  it("gains Blitz when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT8-013", as: "evolving" }] } });
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blitz")).toBe(true);
  });
});
