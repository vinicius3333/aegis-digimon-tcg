import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-034.js";

describe("BT10-034 Dorulumon", () => {
  it("gives an opposing Digimon -3000 DP when another Xros Heart permanent is in play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT10-034", as: "source" }], battleArea: ["BT10-087"] }, 1: { battleArea: [{ card: "BT10-020", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 2000);
    expect(s.perm("target").currentDP).toBe(2000);
  });

  it("reduces all opposing Security Digimon DP only while its host has Shoutmon in its name", async () => {
    const matching = setupEngine({ 0: { battleArea: [{ card: "BT10-009", as: "host", under: ["BT10-034"] }] } });
    await matching.engine.recomputeContinuousEffects();
    expect(observe(matching.engine).securityDp(1)).toBe(-2000);

    const other = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT10-034"] }] } });
    await other.engine.recomputeContinuousEffects();
    expect(observe(other.engine).securityDp(1)).toBe(0);
  });
});
