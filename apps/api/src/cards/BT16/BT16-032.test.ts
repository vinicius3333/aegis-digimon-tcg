import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-032.js";

describe("BT16-032", () => {
  it("models Armor Purge and Collision", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Armor Purge" }, { keyword: "Collision" }] });
  });

  it("ends an attack when its target is switched", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenAttackTargetSwitched", actions: [{ kind: "RedirectAttack", mode: "endAttack", optional: true }] });
  });
});
