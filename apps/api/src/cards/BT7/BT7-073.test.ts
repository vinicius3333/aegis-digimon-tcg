import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-073.js";

describe("BT7-073 KaiserLeomon", () => {
  it("gains Retaliation when it has a Hybrid source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT7-071", as: "base" }], hand: [{ card: "BT7-073", as: "evolving" }] } });
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Retaliation"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Retaliation")).toBe(true);
  });
});
