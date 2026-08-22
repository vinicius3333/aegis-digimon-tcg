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

  it("does not recover when you have exactly 4 security cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST3-07", as: "base" }], hand: [{ card: "ST3-09", as: "evolving" }], deck: [{ card: "ST3-03", as: "top" }], security: ["ST3-02", "ST3-02", "ST3-02", "ST3-02"] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]?.topCard?.cardId === "ST3-09");
    expect(s.state.players[0]!.security).toHaveLength(4);
  });
});
