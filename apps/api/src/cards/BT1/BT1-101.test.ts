import { EffectDuration, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT5/BT5-032.js";
import "./BT1-101.js";

describe("BT1-101 Howling Crusher", () => {
  it("trashes every source under every opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-028"], hand: [{ card: "BT1-101", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT2-047", as: "first", under: ["BT1-001", "BT1-002"] },
            { card: "BT2-060", as: "second", under: ["BT1-003"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").stack.length === 0 && s.perm("second").stack.length === 0);
    expect(s.state.players[1]!.trash).toHaveLength(3);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT1-101", as: "securityOption", faceUp: true }] },
      1: { battleArea: [{ card: "BT2-047", as: "target", under: ["BT1-001", "BT1-002"] }] },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });

  it("does not end an already-declared attack after Security removes the attacker's sources (Q1311)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT1-081",
            as: "attacker",
            dp: 10000,
            under: ["BT1-001", "BT1-002"],
          },
        ],
      },
      1: {
        battleArea: [{ card: "BT5-032", as: "hexeblaumon" }],
        security: ["BT1-101", "BT1-009"],
      },
    });
    advance(s.engine).ledgers.continuous.addKeywordGrant(
      s.perm("attacker").permanentId,
      "SecurityAttack",
      EffectDuration.Permanent,
      1,
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0 && !observe(s.engine).isAttacking());

    expect(s.perm("attacker").stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((entry) => entry.permanentId === s.perm("attacker").permanentId)).toBe(
      true,
    );
  });
});
