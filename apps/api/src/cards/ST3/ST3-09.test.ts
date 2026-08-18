import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST3-09.js";

describe("ST3-09 Angewomon", () => {
  it("recovers the top deck card when digivolving at 3 security", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST3-07", as: "base" }], hand: [{ card: "ST3-09", as: "evolving" }], deck: ["ST3-02", { card: "ST3-03", as: "recovery" }], security: ["ST3-02", "ST3-02", "ST3-02"] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 4);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId)).toBe(true);
  });
});
