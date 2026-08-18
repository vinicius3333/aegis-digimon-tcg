import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-111.js";

describe("BT5-111 Omnimon X Antibody", () => {
  it("digivolves over an Omnimon in the battle area for 3 memory", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT5-086", as: "base" }],
      hand: [{ card: "BT5-111", as: "evolving" }],
    } });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT5-111");

    expect(s.state.memory).toBe(0);
  });

  it("Q1385 rejects the Omnimon shortcut in the breeding area", () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT5-086", as: "base" },
        hand: [{ card: "BT5-111", as: "evolving" }],
      },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("deletes an opposing Digimon with DP at most its own when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-111", as: "omni" }] }, 1: { battleArea: [{ card: "BT4-073", as: "target" }], security: ["BT1-009"] } }, { autoSelectCards: true });
    const targetId = s.perm("target").permanentId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("omni").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId)).toBe(false);
  });

  it("trashes 2 of its sources to end an opponent's attack before the security check", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-111", as: "omni", under: ["BT5-086", "AD1-004"] }],
        security: [{ card: "BT1-009", as: "security" }],
      },
      1: { battleArea: [{ card: "BT5-082", as: "attacker" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    const combat = (s.engine as any).combat as { isAttacking: boolean };

    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => !combat.isAttacking && s.perm("omni").stack.length === 0);

    expect(s.state.players[0]?.security).toHaveLength(1);
    expect(s.state.players[0]?.trash).toHaveLength(2);
  });
});
