import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import {
  setupEngine,
  settle,
  settleAcrossTimers,
  type EngineSetup,
  type PermanentSpec,
} from "../../engine/testkit/harness.js";
import "./BT12-107.js";
import "./BT12-061.js";
import "../BT2/BT2-058.js";
import "../BT13/BT13-108.js";

describe("BT12-107 handwritten module", () => {
  it("registers its printed OnUseOption effect without declarative effect record", () => {
    const module = getEffectModule("BT12-107");
    expect(module?.cardId).toBe("BT12-107");
    const source = {
      instanceId: "source-107",
      cardId: "BT12-107",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
  });
});

it("installs the forced start-of-main-phase attack on the chosen opposing Digimon", async () => {
  const s = setupEngine(
    {
      0: { hand: [{ card: "BT12-107", as: "option" }], battleArea: [{ card: "BT12-061", as: "black" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 1;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => observe(s.engine).customEffectGrants().length > 0);
  expect(observe(s.engine).customEffectGrants()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        instanceId: s.perm("target").topCard!.instanceId,
        token: "[Start of Your Main Phase] Attack with this Digimon.",
      }),
    ]),
  );
});

it("registers its printed Security add-to-hand effect", () => {
  const module = getEffectModule("BT12-107");
  const source = { instanceId: "source-107", cardId: "BT12-107", ownerSeat: 0, isOnBattleArea: () => false } as never;
  expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
});

it("returns itself to its owner's hand from Security", async () => {
  const s = setupEngine({ 0: { security: [{ card: "BT12-107", as: "option", faceUp: true }] } });
  await s.ready();
  await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
  expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT12-107");
});

describe("BT12-107 Laplace's Demon — KB Q&A rulings", () => {
  const FILLER = ["BT1-009", "BT1-009", "BT1-009", "BT1-009"];

  function laplaceBoard(opponentDigimon: PermanentSpec[], laplaceCount = 1) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: Array.from({ length: laplaceCount }, (_, index) => ({ card: "BT12-107", as: `laplace${index}` })),
          battleArea: [{ card: "BT12-061", as: "black" }],
          deck: [...FILLER],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          hand: [{ card: "BT13-108", as: "waltzEnd" }],
          battleArea: opponentDigimon,
          deck: [...FILLER],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    return { s, preferred };
  }

  async function useLaplaceOn(
    s: EngineSetup,
    preferred: string[],
    aliases: string[],
    onMainPhase: () => void = () => {},
  ): Promise<string[][]> {
    const offeredTargets: string[][] = [];
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    onMainPhase();
    for (const [index, alias] of aliases.entries()) {
      preferred.splice(0, preferred.length, s.perm(alias).permanentId);
      s.state.memory = 3;
      const decisionsBefore = s.decisions.length;
      const grantsBefore = observe(s.engine).customEffectGrants(s.perm(alias)).length;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(`laplace${index}`).instanceId })).toEqual({
        ok: true,
      });
      await settle(() => observe(s.engine).customEffectGrants(s.perm(alias)).length > grantsBefore);
      const targetDecision = s.decisions
        .slice(decisionsBefore)
        .find(({ seat, req }) => seat === 0 && req.kind === "chooseTargets");
      offeredTargets.push(targetDecision?.req.options?.candidateInstanceIds ?? []);
    }
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    return offeredTargets;
  }

  async function runOpponentStartOfMainPhase(s: EngineSetup): Promise<void> {
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await settleAcrossTimers(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  }

  const attacksBy = (s: EngineSetup, aliases: string[]) => {
    const attackerIds = aliases.map((alias) => s.perm(alias).permanentId);
    return s.events.filter(
      (event) => event.kind === "attackDeclared" && attackerIds.includes(event.attackerPermanentId),
    );
  };

  it("can target a Digimon that can't attack, but that Digimon still does not attack (Q2243)", async () => {
    const board: PermanentSpec[] = [
      { card: "BT2-058", as: "guardromon" },
      { card: "BT1-009", as: "monodramon", dp: 10_000 },
    ];
    const { s, preferred } = laplaceBoard(board);
    await s.ready();
    const [offered] = await useLaplaceOn(s, preferred, ["guardromon"]);
    expect(offered).toContain(s.perm("guardromon").permanentId);
    expect(observe(s.engine).customEffectGrants(s.perm("guardromon"))).toHaveLength(1);

    await runOpponentStartOfMainPhase(s);
    expect(attacksBy(s, ["guardromon", "monodramon"])).toHaveLength(0);
    expect(s.perm("guardromon").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(3);

    const control = laplaceBoard(board);
    await control.s.ready();
    await useLaplaceOn(control.s, control.preferred, ["monodramon"]);
    await runOpponentStartOfMainPhase(control.s);
    expect(attacksBy(control.s, ["monodramon"])).toHaveLength(1);
  });

  it("declares only one attack when two granted start-of-main attacks trigger together (Q2244)", async () => {
    const { s, preferred } = laplaceBoard(
      [
        { card: "BT1-009", as: "first", dp: 10_000 },
        { card: "BT1-009", as: "second", dp: 10_000 },
      ],
      2,
    );
    await s.ready();
    await useLaplaceOn(s, preferred, ["first", "second"]);
    expect(observe(s.engine).customEffectGrants(s.perm("first"))).toHaveLength(1);
    expect(observe(s.engine).customEffectGrants(s.perm("second"))).toHaveLength(1);

    await runOpponentStartOfMainPhase(s);
    expect(attacksBy(s, ["first", "second"])).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect([s.perm("first").isSuspended, s.perm("second").isSuspended].sort()).toEqual([false, true]);
  });

  it("can target a Digimon unaffected by Options on the opponent's turn, and it attacks once that immunity ends (Q2245)", async () => {
    const { s, preferred } = laplaceBoard([
      { card: "BT12-061", as: "ganemon", dp: 10_000 },
      { card: "BT1-009", as: "monodramon", dp: 10_000 },
    ]);
    await s.ready();
    s.state.turnSeat = 1;
    const waltzTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("waltzEnd").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).customEffectGrants(s.perm("ganemon")).length === 2);
    expect(observe(s.engine).customEffectGrants(s.perm("monodramon"))).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(1);
    await waltzTurn;

    const [offered] = await useLaplaceOn(s, preferred, ["ganemon"], () => {
      expect(observe(s.engine).isRestrictedByEffect(s.perm("ganemon"), "beAffected", "Option")).toBe(true);
    });
    expect(offered).toContain(s.perm("ganemon").permanentId);

    await runOpponentStartOfMainPhase(s);
    expect(attacksBy(s, ["ganemon", "monodramon"])).toHaveLength(1);
    expect(attacksBy(s, ["ganemon"])).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });
});
