import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { recordDigimonAttack, rollTurnActivity } from "../../engine/turnActivity.js";
import "../ST4/ST4-12.js";
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
    const attackerPermanentId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenBlockWindow: boolean } }).combat;
    await settle(() => combat.hasOpenBlockWindow);
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1 && !observe(s.engine).isAttacking());
    expect(observe(s.engine).hasAttackedThisTurn(attackerPermanentId)).toBe(true);
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

async function runOpponentTurn(s: ReturnType<typeof setupEngine>, duringMain?: () => Promise<void>): Promise<void> {
  s.state.turnSeat = 1;
  s.state.memory = 3;
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(1);
  await duringMain?.();
  advance(s.engine).endMainPhaseIfOpen(1);
  await turn;
}

function handHas(s: ReturnType<typeof setupEngine>, alias: string): boolean {
  return s.state.players[0]!.hand.some((card) => card.instanceId === s.inst(alias).instanceId);
}

describe("ST5-04 ToyAgumon — KB Q&A rulings", () => {
  it("draws even when the opponent had no Digimon in play for their whole turn (Q658)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST5-08", under: ["ST5-04"], as: "host" }],
        deck: [{ card: "ST5-03", as: "drawn" }, "ST5-03"],
        security: ["ST5-03"],
      },
      1: { deck: ["ST5-03", "ST5-03"], security: ["ST5-03"] },
    });
    await s.ready();

    await runOpponentTurn(s, async () => {
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
    });

    expect(observe(s.engine).attackedWithDigimonThisTurn(1)).toBe(false);
    expect(handHas(s, "drawn")).toBe(true);
  });

  it("draws when effects stopped every opposing Digimon from attacking (Q659)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST5-08", under: ["ST5-04"], as: "host" },
            { card: "ST4-10", as: "rosemonBase" },
          ],
          hand: [{ card: "ST4-12", as: "rosemon" }],
          deck: [{ card: "ST5-03", as: "digivolveDraw" }, { card: "ST5-03", as: "drawn" }, "ST5-03"],
          security: ["ST5-03"],
        },
        1: { battleArea: [{ card: "ST5-03", as: "attacker" }], deck: ["ST5-03", "ST5-03"], security: ["ST5-03"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rosemonBase").permanentId,
        instanceId: s.inst("rosemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("attacker"), "attack"));
    expect(handHas(s, "digivolveDraw")).toBe(true);
    expect(handHas(s, "drawn")).toBe(false);

    await runOpponentTurn(s, async () => {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }).ok,
      ).toBe(false);
    });

    expect(observe(s.engine).attackedWithDigimonThisTurn(1)).toBe(false);
    expect(handHas(s, "drawn")).toBe(true);
  });

  it("does not draw when every opposing attacker was deleted in the battle it started (Q660)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST5-08", under: ["ST5-04"], as: "host", suspended: true }],
        deck: [{ card: "ST5-03", as: "drawn" }, "ST5-03"],
        security: ["ST5-03"],
      },
      1: { battleArea: [{ card: "ST5-03", as: "attacker" }], deck: ["ST5-03", "ST5-03"], security: ["ST5-03"] },
    });
    await s.ready();
    const attackerPermanentId = s.perm("attacker").permanentId;

    await runOpponentTurn(s, async () => {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId,
          target: { kind: "permanent", permanentId: s.perm("host").permanentId },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
    });

    expect(observe(s.engine).attackedWithDigimonThisTurn(1)).toBe(true);
    expect(s.perm("host").topCard?.cardId).toBe("ST5-08");
    expect(handHas(s, "drawn")).toBe(false);
  });
});
