import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-048.js";

describe("BT8-048 Shurimon", () => {
  it("prevents an opposing Blocker from attacking or blocking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-064", as: "base" }], hand: [{ card: "BT8-048", as: "evolving" }] }, 1: { battleArea: [{ card: "ST5-08", as: "blocker" }] } }, { autoSelectCards: true });
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("blocker"), "attack") && observe(s.engine).isRestricted(s.perm("blocker"), "block"));
    expect(observe(s.engine).isRestricted(s.perm("blocker"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("blocker"), "block")).toBe(true);
  });
});
