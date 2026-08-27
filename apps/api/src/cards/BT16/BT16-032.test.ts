import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-032.js";
import "../index.js";

describe("BT16-032", () => {
  it("models Armor Purge and Collision", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Armor Purge" }, { keyword: "Collision" }],
    });
  });

  it("ends an attack when its target is switched", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttackTargetSwitched",
      actions: [{ kind: "RedirectAttack", mode: "endAttack", optional: true }],
    });
  });

  it("keeps Armor Purge and Collision active on a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-032", as: "sheepmon" }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("sheepmon"), "Armor Purge")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("sheepmon"), "Collision")).toBe(true);
  });
});
