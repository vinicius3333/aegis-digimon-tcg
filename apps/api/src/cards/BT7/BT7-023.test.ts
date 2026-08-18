import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-023.js";

describe("BT7-023 Korikakumon", () => {
  it("prevents a source-less opposing Digimon from attacking or blocking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT7-021", as: "base" }], hand: [{ card: "BT7-023", as: "evolving" }] }, 1: { battleArea: [{ card: "BT2-047", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attack") && observe(s.engine).isRestricted(s.perm("target"), "block"));
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);
  });
});
