import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-036.js";

describe("BT6-036 Mimicmon", () => {
  it("gains two memory when its owner has three or fewer security cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT6-036", as: "source" }], security: 3 } });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);
    expect(s.state.memory).toBe(2);
  });
});
