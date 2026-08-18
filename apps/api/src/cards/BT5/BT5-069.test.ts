import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-069.js";

describe("BT5-069 BlackWarGreymon", () => {
  it("has Security Attack +1 and Reboot without immediately unsuspending", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-069", as: "blackwar", suspended: true }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).keywordAmount(s.perm("blackwar"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("blackwar"), "Reboot")).toBe(true);
    expect(s.perm("blackwar").isSuspended).toBe(true);
  });
});
