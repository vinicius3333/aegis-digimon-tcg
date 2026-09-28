import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST2-11.js";

describe("ST2-11 MetalGarurumon", () => {
  it("matches the once-per-turn self-unsuspend contract", () => {
    const definition = getCardDefinition("ST2-11")!;
    const compiled = getCompiledCard("ST2-11")!;

    expect(definition.effectText).toContain("[Once Per Turn] Unsuspend this Digimon");
    expect(compiled.effects).toEqual([
      {
        trigger: "WhenAttacking",
        actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
        frequency: "OncePerTurn",
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("unsuspends after attacking and may attack again", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-11", as: "metalGarurumon" }], deck: ["BT1-030", "BT1-031", "BT1-032"] },
      1: { security: ["BT1-030", "BT1-031", "BT1-032"], deck: ["BT1-033", "BT1-034", "BT1-035"] },
    });
    const attackerId = s.perm("metalGarurumon").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.phase === Phase.Main &&
        !s.perm("metalGarurumon").isSuspended &&
        s.state.players[1]!.security.length === 2 &&
        !observe(s.engine).isAttacking(),
    );
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.phase === Phase.Main &&
        s.state.players[1]!.security.length === 1 &&
        s.perm("metalGarurumon").isSuspended,
    );
    expect(s.perm("metalGarurumon").isSuspended).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 0 &&
        !s.perm("metalGarurumon").isSuspended &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.perm("metalGarurumon").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});

describe("ST2-11 MetalGarurumon — KB Q&A rulings", () => {
  function setupAttacker(opponentBattleArea: { card: string; as: string }[] = []) {
    return setupEngine({
      0: { battleArea: [{ card: "ST2-11", as: "metalGarurumon" }], deck: ["BT1-030", "BT1-031", "BT1-032"] },
      1: {
        battleArea: opponentBattleArea,
        security: ["BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-033", "BT1-034", "BT1-035"],
      },
    });
  }

  function attack(
    s: ReturnType<typeof setupAttacker>,
    target: { kind: "player" } | { kind: "permanent"; permanentId: string },
  ) {
    return s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("metalGarurumon").permanentId,
      target,
    });
  }

  async function settleAttack(s: ReturnType<typeof setupAttacker>, securityLeft: number) {
    await settle(
      () =>
        s.state.phase === Phase.Main &&
        s.state.players[1]!.security.length === securityLeft &&
        !observe(s.engine).isAttacking(),
    );
  }

  it("unsuspends only on the first attack of the turn, not on every attack (Q616)", async () => {
    const s = setupAttacker();

    expect(attack(s, { kind: "player" })).toEqual({ ok: true });
    await settleAttack(s, 2);
    expect(s.perm("metalGarurumon").isSuspended).toBe(false);

    expect(attack(s, { kind: "player" })).toEqual({ ok: true });
    await settleAttack(s, 1);
    expect(s.perm("metalGarurumon").isSuspended).toBe(true);

    expect(attack(s, { kind: "player" })).not.toEqual({ ok: true });
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("can unsuspend itself again on the next turn, so the effect is not once per game (Q617)", async () => {
    const s = setupAttacker();
    const attackerId = s.perm("metalGarurumon").permanentId;

    expect(attack(s, { kind: "player" })).toEqual({ ok: true });
    await settleAttack(s, 2);
    expect(attack(s, { kind: "player" })).toEqual({ ok: true });
    await settleAttack(s, 1);
    expect(s.perm("metalGarurumon").isSuspended).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    const unsuspendEvents = await observe(s.engine).captureSubTriggers(async () => {
      expect(attack(s, { kind: "player" })).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[1]!.security.length === 0 &&
          !s.perm("metalGarurumon").isSuspended &&
          !observe(s.engine).isAttacking(),
      );
    });

    expect(s.perm("metalGarurumon").isSuspended).toBe(false);
    expect(
      unsuspendEvents.filter(
        ({ event, payload }) => event === "whenUnsuspended" && payload.unsuspendedPermanentId === attackerId,
      ),
    ).not.toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("is already unsuspended when the security check and the battle with a Digimon resolve (Q618)", async () => {
    async function recordAttackDuringResolution(
      s: ReturnType<typeof setupAttacker>,
      target: { kind: "player" } | { kind: "permanent"; permanentId: string },
      resolved: () => boolean,
    ) {
      const attackerId = s.perm("metalGarurumon").permanentId;
      const snapshot = (step: string) => ({
        step,
        attackerSuspended: s.perm("metalGarurumon").isSuspended,
        opponentSecurity: s.state.players[1]!.security.length,
        opponentDigimon: s.state.players[1]!.battleArea.length,
      });
      const timeline: ReturnType<typeof snapshot>[] = [];
      await observe(s.engine).captureSubTriggers(
        async () => {
          expect(attack(s, target)).toEqual({ ok: true });
          timeline.push(snapshot("attackDeclared"));
          await settle(() => s.state.phase === Phase.Main && resolved() && !observe(s.engine).isAttacking());
        },
        (event, payload) => {
          if (event === "whenUnsuspended" && payload.unsuspendedPermanentId === attackerId) {
            timeline.push(snapshot(event));
          }
        },
      );
      timeline.push(snapshot("attackResolved"));
      return timeline;
    }

    const securityCheck = setupAttacker();
    expect(
      await recordAttackDuringResolution(
        securityCheck,
        { kind: "player" },
        () => securityCheck.state.players[1]!.security.length === 2,
      ),
    ).toEqual([
      { step: "attackDeclared", attackerSuspended: true, opponentSecurity: 3, opponentDigimon: 0 },
      { step: "whenUnsuspended", attackerSuspended: false, opponentSecurity: 3, opponentDigimon: 0 },
      { step: "attackResolved", attackerSuspended: false, opponentSecurity: 2, opponentDigimon: 0 },
    ]);

    const digimonBattle = setupAttacker([{ card: "BT1-009", as: "defender" }]);
    digimonBattle.perm("defender").isSuspended = true;
    expect(
      await recordAttackDuringResolution(
        digimonBattle,
        { kind: "permanent", permanentId: digimonBattle.perm("defender").permanentId },
        () => digimonBattle.state.players[1]!.battleArea.length === 0,
      ),
    ).toEqual([
      { step: "attackDeclared", attackerSuspended: true, opponentSecurity: 3, opponentDigimon: 1 },
      { step: "whenUnsuspended", attackerSuspended: false, opponentSecurity: 3, opponentDigimon: 1 },
      { step: "attackResolved", attackerSuspended: false, opponentSecurity: 3, opponentDigimon: 0 },
    ]);
  });
});
