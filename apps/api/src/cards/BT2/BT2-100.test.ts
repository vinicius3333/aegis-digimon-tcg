import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-100.js";

describe("BT2-100 Flower Cannon", () => {
  it("suspends an opposing Digimon and boosts yours", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-042", as: "mine" }], hand: [{ card: "BT2-100", as: "option" }] }, 1: { battleArea: [{ card: "BT2-045", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended && s.perm("mine").currentDP === 5000);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("mine").currentDP).toBe(5000);
  });
});
