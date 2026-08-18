import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-061.js";

describe("BT7-061 Gigasmon", () => {
  it("digivolves onto a black Tamer and has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-089", as: "tamer" }], hand: [{ card: "BT7-061", as: "gigas" }], deck: ["BT1-001"] } });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("tamer").permanentId, instanceId: s.inst("gigas").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT7-061" && s.state.memory === 0);
    await s.engine.recomputeContinuousEffects();

    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("tamer"), "Blocker")).toBe(true);
  });
});
