import { describe, expect, it } from "vitest";
import { EffectTiming, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type BoardSpec, type CardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-083.js";
import "../index.js";

describe("BT22-083 Yuuko Kamishiro", () => {
  it("gains memory when an opponent Digimon exists at the start of your main phase", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "opponentHas", filter: { kind: ["Digimon"] } },
    });
  });

  it("binds immunity and DP to the same paid target", () => {
    const block = (
      compiled.effects.find((entry) => !entry.isInherited && entry.trigger === "AllTurns")?.actions[0] as any
    ).actions[0];
    expect(block).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "suspend", target: { filter: { isSelfRef: true } } },
      optional: true,
      abortOnDecline: true,
    });
    expect(block.actions[0]).toMatchObject({ kind: "SelectBind", target: { bindAs: "yuukoProtectedDigimon" } });
    expect(block.actions[1]).toMatchObject({
      kind: "GrantImmunity",
      target: { fromSelectionRef: "yuukoProtectedDigimon" },
      immuneFrom: "opponentDigimonEffects",
    });
    expect(block.actions[2]).toMatchObject({
      kind: "ModifyDP",
      target: { fromSelectionRef: "yuukoProtectedDigimon" },
      amount: 3000,
    });
    expect(block.actions[2].optional).toBeUndefined();
  });

  it("uses an executable Eater Eve name condition for the inherited attack-target-change DP", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "ModifyDP",
              amount: 3000,
              duration: "forTheTurn",
              condition: { kind: "selfHasName", names: ["Eater Eve"] },
            },
          ],
        },
      ],
    });
  });

  it("observably gains start-main memory only while an opponent Digimon exists", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT22-083", as: "yuuko" }] }, 1: { battleArea: ["BT1-009"] } });
    const before = s.state.memory;
    await (
      s.engine as unknown as { fireTiming(t: EffectTiming, trigger: Record<string, never>): Promise<void> }
    ).fireTiming(EffectTiming.OnStartMainPhase, {});
    await settle(() => s.state.memory !== before);
    expect(s.state.memory).toBe(before + 1);
  });

  it("protects the chosen Digimon from opposing Digimon effects but not Option effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-083", as: "yuuko" },
            { card: "AD1-001", as: "greymon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const greymon = s.perm("greymon");
    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {
      attackerPermanentId: greymon.permanentId,
    });

    expect(greymon.immuneToOpponentDigimonEffects).toBe(true);
    expect(greymon.immuneToOpponentOptionEffects).toBe(false);
  });
});

describe("BT22-083 Yuuko Kamishiro — KB Q&A rulings", () => {
  const GUARD_DP = 10000;

  function protectedBoard(opponentHand: CardSpec[]): BoardSpec {
    return {
      0: {
        battleArea: [
          { card: "BT22-083", as: "yuuko" },
          { card: "BT22-079", as: "eater" },
          { card: "BT22-043", as: "guard", dp: GUARD_DP },
          { card: "BT3-083", as: "bystander" },
        ],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "attacker", dp: 1000 }],
        // A spare playable card keeps the opponent's Main open, so the turn-long immunity is observable.
        hand: [...opponentHand, "BT1-010"],
        security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        deck: ["BT1-005", "BT1-006", "BT1-007"],
      },
    };
  }

  function setupPreferringGuard(board: BoardSpec) {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(board, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferInstanceIds,
    });
    preferInstanceIds.push(s.perm("guard").permanentId, s.perm("guard").topCard.instanceId);
    s.state.isFirstPlayersFirstTurn = false;
    return s;
  }

  async function duringMainPhase(s: EngineSetup, seat: Seat, body: () => Promise<void>) {
    s.state.turnSeat = seat;
    s.state.memory = 10;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(seat);
    await body();
    advance(s.engine).endMainPhaseIfOpen(seat);
    await turn;
  }

  async function opponentPlays(s: EngineSetup, alias: string) {
    const instanceId = s.inst(alias).instanceId;
    const decisionsBefore = s.decisions.length;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === instanceId));
    await settle(() => s.state.pendingDecision === undefined);
    const choice = s.decisions
      .slice(decisionsBefore)
      .find(({ seat, req }) => seat === 1 && req.kind === "chooseTargets");
    return choice?.req.options?.candidateInstanceIds ?? [];
  }

  /** The opponent attacks, the Eater blocks, and the attack-target change lets Yuuko protect the guard. */
  async function blockSoYuukoProtectsGuard(s: EngineSetup) {
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("eater").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("yuuko").isSuspended);
    await advance(s.engine).finishAttack();
    expect(s.perm("guard").immuneToOpponentDigimonEffects).toBe(true);
  }

  const offersGuard = (s: EngineSetup, candidates: string[]) =>
    candidates.includes(s.perm("guard").permanentId) || candidates.includes(s.perm("guard").topCard.instanceId);

  it("can be chosen by an opposing Digimon's suspend effect but is not suspended (Q4950, Q4951)", async () => {
    const s = setupPreferringGuard(protectedBoard([{ card: "BT1-070", as: "suspender" }]));
    await s.ready();

    await duringMainPhase(s, 1, async () => {
      await blockSoYuukoProtectsGuard(s);
      const candidates = await opponentPlays(s, "suspender");

      expect(offersGuard(s, candidates)).toBe(true);
      expect(s.perm("guard").isSuspended).toBe(false);
    });
  });

  it("does not get -3000 DP from an opposing Digimon's effect that chose it (Q4950)", async () => {
    const s = setupPreferringGuard(protectedBoard([{ card: "BT1-055", as: "reducer" }]));
    await s.ready();

    await duringMainPhase(s, 1, async () => {
      await blockSoYuukoProtectsGuard(s);
      expect(s.perm("guard").currentDP).toBe(GUARD_DP + 3000);

      const candidates = await opponentPlays(s, "reducer");

      expect(offersGuard(s, candidates)).toBe(true);
      expect(s.perm("guard").currentDP).toBe(GUARD_DP + 3000);
    });
  });

  it("stops being affected by an earlier -6000 DP as soon as it gains the immunity (Q4953)", async () => {
    const s = setupPreferringGuard(protectedBoard([{ card: "BT15-038", as: "reducer" }]));
    await s.ready();

    await duringMainPhase(s, 1, async () => {
      await opponentPlays(s, "reducer");
      expect(s.perm("guard").currentDP).toBe(GUARD_DP - 6000);

      await blockSoYuukoProtectsGuard(s);

      expect(s.perm("guard").currentDP).toBe(GUARD_DP + 3000);
    });
  });

  it("is given -6000 DP while immune and gets it once the immunity ends (Q4952, Q4954)", async () => {
    const s = setupPreferringGuard(protectedBoard([{ card: "BT15-038", as: "reducer" }]));
    await s.ready();

    await duringMainPhase(s, 1, async () => {
      await blockSoYuukoProtectsGuard(s);
      const candidates = await opponentPlays(s, "reducer");

      expect(offersGuard(s, candidates)).toBe(true);
      expect(s.perm("guard").currentDP).toBe(GUARD_DP + 3000);
    });

    await duringMainPhase(s, 0, async () => {
      expect(s.perm("guard").immuneToOpponentDigimonEffects).toBe(false);
      expect(s.perm("guard").currentDP).toBe(GUARD_DP - 6000);
    });
  });

  it("does not trigger a [When Attacking] effect an opposing Digimon gave it while it is immune (Q4955)", async () => {
    const s = setupPreferringGuard({
      0: {
        battleArea: [
          { card: "BT22-083", as: "yuuko" },
          { card: "BT1-009", as: "striker" },
          { card: "BT22-043", as: "guard", under: [{ card: "BT1-001", as: "guardBottom" }] },
          { card: "BT1-010", as: "ally", under: [{ card: "BT1-002", as: "allyBottom" }] },
        ],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
      1: {
        battleArea: [
          { card: "BT8-031", as: "frosVelgrmon" },
          { card: "BT22-079", as: "opposingBlocker", dp: 20000 },
        ],
        security: ["BT1-003", "BT1-004", "BT1-005", "BT1-006"],
        deck: ["BT1-007"],
      },
    });
    await s.ready();
    const attackPlayer = async (alias: string) => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(alias).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking() || observe(s.engine).blockingSeat() === 1);
    };

    await duringMainPhase(s, 0, async () => {
      await attackPlayer("striker");
      expect(
        s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("opposingBlocker").permanentId }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("yuuko").isSuspended);
      await advance(s.engine).finishAttack();
      expect(s.perm("guard").immuneToOpponentDigimonEffects).toBe(true);

      await attackPlayer("guard");
      await advance(s.engine).finishAttack();
      await attackPlayer("ally");
      await advance(s.engine).finishAttack();

      expect(s.perm("guard").stack.map((card) => card.instanceId)).toEqual([s.inst("guardBottom").instanceId]);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("allyBottom").instanceId);
    });
  });
});
