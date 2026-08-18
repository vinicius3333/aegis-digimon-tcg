import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-001.js";
import "./BT1-072.js";

describe("BT1-001 Yokomon", () => {
  it("gives +1000 DP when its Digimon attacks an opposing Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 5000, under: ["BT1-001"] }] }, 1: { battleArea: [{ card: "BT1-017", as: "defender", dp: 5500, suspended: true }] } });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: s.perm("defender").permanentId } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("does not gain DP in a security battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 5000, under: ["BT1-001"] }] },
      1: { security: ["BT1-020"] },
    });
    const attackerId = s.perm("attacker").permanentId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(false);
  });

  it("does not gain DP when a player attack is redirected by Blocker", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-016", as: "attacker", dp: 5000, under: ["BT1-001"] }] },
      1: { battleArea: [{ card: "BT1-072", as: "blocker", dp: 5500 }], security: ["BT1-010"] },
    });
    const attackerId = s.perm("attacker").permanentId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(false);
  });
});
