import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-022.js";

describe("EX1-022 Imperialdramon: Dragon Mode", () => {
  it("unsuspends itself and suspends an opponent when digivolving over a Free card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-019", as: "base", suspended: true }], hand: [{ card: "EX1-022", as: "evo" }] }, 1: { battleArea: [{ card: "BT1-009", as: "opponent" }] } }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evo").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended && s.perm("opponent").isSuspended);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("gets +1000 DP for each distinct color in its digivolution cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-022", as: "imperialdramon", dp: 12000, under: ["EX1-019", "BT1-069"] }] } });
    await s.ready();
    expect(s.perm("imperialdramon").currentDP).toBe(14000);
  });
});
