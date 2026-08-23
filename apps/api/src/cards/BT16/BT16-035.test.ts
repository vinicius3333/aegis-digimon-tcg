import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-035.js";
import "../index.js";

describe("BT16-035", () => {
  it("grants itself the Angel trait", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Angel"] }],
      keywords: [{ keyword: "Barrier" }, { keyword: "Reboot" }],
    });
  });

  it("has Barrier, Reboot, and an optional once-per-turn unsuspend after security removal", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
    });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      actions: [{ kind: "Unsuspend", optional: true }],
    });
  });

  it("grants the printed Angel rule trait and keywords on a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-035", as: "slash" }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasEffectiveTrait(s.perm("slash"), "Angel")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("slash"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("slash"), "Reboot")).toBe(true);
  });
});
