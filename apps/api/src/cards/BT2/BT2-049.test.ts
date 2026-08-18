import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-049.js";

describe("BT2-049 Puppetmon", () => {
  it("suspends an opponent Digimon and prevents opposing Digimon from unsuspending", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT2-049", as: "source" }] }, 1: { battleArea: [
      { card: "BT1-070", as: "target", dp: 4000 },
    ] } }, { autoSelectCards: true });
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("target").isSuspended &&
        observe(s.engine).isRestricted(s.perm("target"), "unsuspend"),
    );
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });
});
