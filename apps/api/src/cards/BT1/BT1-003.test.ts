import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-003.js";

describe("BT1-003 Upamon", () => {
  it("draws once per turn when attacking while the opponent has a source-less Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-032", as: "attacker", under: ["BT1-003"] }], deck: [{ card: "BT1-010", as: "drawn" }] }, 1: { battleArea: ["BT1-016"], security: ["BT1-011"] } });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("does not count a source-less Digimon in the opponent's breeding area", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "attacker", under: ["BT1-003"] }], deck: [{ card: "BT1-010", as: "top" }] },
      1: { breeding: "BT1-016", security: ["BT1-011"] },
    });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
