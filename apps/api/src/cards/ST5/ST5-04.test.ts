import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { recordDigimonAttack, rollTurnActivity } from "../../engine/turnActivity.js";
import "./ST5-04.js";

describe("ST5-04 ToyAgumon", () => {
  it("is fully represented with the current-turn no-attack condition", () => {
    expect(runtimeCompiledCard("ST5-04")).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "EndOfOpponentsTurn",
          isInherited: true,
          actions: [{ kind: "Draw", amount: 1, condition: { kind: "opponentDidNotAttackWithDigimonThisTurn" } }],
        },
      ],
    });
  });

  it("draws at the end of the opponent's turn if they did not attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST5-08", under: ["ST5-04"], as: "host" }], deck: [{ card: "ST5-03", as: "drawn" }] },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("does not draw if an opposing Digimon attacked earlier in the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST5-08", under: [{ card: "ST5-04", as: "toyAgumon" }], as: "host" }],
        security: ["ST5-03", "ST5-03"],
        deck: ["ST5-03", "ST5-03"],
      },
      1: {
        battleArea: [
          { card: "ST5-03", as: "attacker" },
          { card: "ST5-03", as: "remainingAttacker" },
        ],
      },
    });
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("attacker"))).toBe(true);
    expect(observe(s.engine).attackedWithDigimonThisTurn(1)).toBe(true);
    expect(s.inst("toyAgumon").ownerSeat).toBe(0);
    const handBeforeEndEffect = s.state.players[0]!.hand.length;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(handBeforeEndEffect);
  });

  it("still draws when the opponent attacked on the previous turn but not this turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST5-08", under: ["ST5-04"], as: "host" }], deck: ["ST5-03"] } });
    s.state.turnSeat = 1;
    recordDigimonAttack(s.state, 1);
    rollTurnActivity(s.state);
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
