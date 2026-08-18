import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-020.js";

describe("BT4-020 ShineGreymon", () => {
  it("gains Security Attack +1 separately for each red or yellow Tamer suspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-020", as: "shine" }, { card: "BT1-085", as: "red" }, { card: "BT1-087", as: "yellow" }] } });
    await s.engine.recomputeContinuousEffects();
    const fx = (s.engine as any).primitives as Primitives;
    await fx.suspend([s.perm("red").permanentId], { byEffectSeat: 0 });
    expect(observe(s.engine).keywordAmount(s.perm("shine"), "SecurityAttack")).toBe(1);
    await fx.suspend([s.perm("yellow").permanentId], { byEffectSeat: 0 });

    expect(observe(s.engine).keywordAmount(s.perm("shine"), "SecurityAttack")).toBe(2);
  });
});
