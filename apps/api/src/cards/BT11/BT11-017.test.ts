import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-017.js";

describe("BT11-017 Marsmon", () => {
  it("has Raid and gains Blitz when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-017", as: "marsmon" }] } });

    await advance(s.engine).recompute();
    expect(observe(s.engine).hasKeyword(s.perm("marsmon"), "Raid")).toBe(true);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("marsmon"));
    expect(observe(s.engine).hasKeyword(s.perm("marsmon"), "Blitz")).toBe(true);
  });

  it("Q2062: unsuspends and gains memory once when an attack target switches", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-017", as: "marsmon", suspended: true }, "BT1-085", "BT12-092"],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnAttackTargetChanged, s.perm("marsmon"));
    expect(s.perm("marsmon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(2);

    await advance(s.engine).fire(EffectTiming.OnAttackTargetChanged, s.perm("marsmon"));
    expect(s.state.memory).toBe(2);
  });
});
