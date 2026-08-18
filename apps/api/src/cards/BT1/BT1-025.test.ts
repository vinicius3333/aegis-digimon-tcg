import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-025.js";
import "./BT1-112.js";

describe("BT1-025 WarGreymon", () => {
  it("gains Security Attack +1 for the turn when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-020", as: "base", dp: 20000 }], hand: [{ card: "BT1-025", as: "evolving" }] }, 1: { security: ["BT1-010", "BT1-011", "BT1-012"] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "SecurityAttack"));
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("base").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not activate Security effects on checked Option cards during its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-025", as: "attacker", dp: 20000 }] }, 1: { security: [{ card: "BT1-112", as: "option" }] } });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(false);
  });
});
