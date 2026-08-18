import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-037.js";

describe("BT9-037 Nefertimon", () => {
  it("gives an opposing Digimon -2000 DP when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-037", as: "nefertimon" }] }, 1: { battleArea: [{ card: "BT1-028", as: "target" }] } }, { autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("nefertimon"));
    expect(s.perm("target").currentDP).toBe(1000);
  });
});
