import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { DecisionRequest } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import type { PermanentSpec } from "../../engine/testkit/harness.js";
import "./BT12-104.js";
import "./BT12-092.js";

describe("BT12-104 handwritten module", () => {
  it("registers its printed OnUseOption effect without declarative effect record", () => {
    const module = getEffectModule("BT12-104");
    expect(module?.cardId).toBe("BT12-104");
    const source = {
      instanceId: "source-104",
      cardId: "BT12-104",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });
});

it("plays Marcus Damon and gives up to three opposing Digimon -2000 DP per yellow/red Tamer", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [
          { card: "BT12-104", as: "option" },
          { card: "BT12-092", as: "marcus" },
        ],
        battleArea: [{ card: "BT12-092", as: "tamer" }],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "target1", dp: 5000 },
          { card: "BT1-009", as: "target2", dp: 5000 },
          { card: "BT1-009", as: "target3", dp: 5000 },
        ],
        security: ["BT1-009"],
      },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 5;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(
    () =>
      s.perm("target1").currentDP === 1000 &&
      s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT12-092"),
  );
  expect(s.perm("target1").currentDP).toBe(1000);
  expect(s.perm("target2").currentDP).toBe(1000);
  expect(s.perm("target3").currentDP).toBe(1000);
});

describe("BT12-104 Shining Blast — KB Q&A rulings", () => {
  async function useShiningBlast(tamers: PermanentSpec[], opponentDigimon: PermanentSpec[]) {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT12-104", as: "option" }], battleArea: tamers },
        1: { battleArea: opponentDigimon, security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await drainMicrotasks();
    return s;
  }

  const threeOpposingDigimon: PermanentSpec[] = [
    { card: "BT1-009", as: "target1", dp: 5000 },
    { card: "BT1-009", as: "target2", dp: 5000 },
    { card: "BT1-009", as: "target3", dp: 5000 },
  ];

  it("counts a 2-color yellow/red Tamer as only 1 Tamer (Q2239)", async () => {
    const oneTamer = await useShiningBlast([{ card: "BT12-092", as: "marcus" }], threeOpposingDigimon);
    expect(oneTamer.state.players[0]!.hand).toHaveLength(0);
    for (const target of ["target1", "target2", "target3"]) {
      expect(oneTamer.perm(target).currentDP).toBe(3000);
    }

    const twoTamers = await useShiningBlast(
      [
        { card: "BT12-092", as: "marcus" },
        { card: "BT12-092", as: "secondMarcus" },
      ],
      threeOpposingDigimon,
    );
    expect(twoTamers.perm("target1").currentDP).toBe(1000);
  });

  it("gives only 3 opposing Digimon -4000 DP with 2 yellow or red Tamers, not 6 Digimon -2000 DP (Q2240)", async () => {
    const targets = ["target1", "target2", "target3", "target4", "target5", "target6"];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-104", as: "option" }],
          battleArea: [
            { card: "BT12-092", as: "marcus" },
            { card: "BT12-092", as: "secondMarcus" },
          ],
        },
        1: { battleArea: targets.map((target) => ({ card: "BT1-009", as: target, dp: 5000 })), security: ["BT1-009"] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    const isShiningBlastTargetChoice = ({ req }: { req: DecisionRequest }) =>
      req.sourceCardId === "BT12-104" && req.kind === "chooseTargets";
    await settle(() => s.decisions.some(isShiningBlastTargetChoice));
    const choice = s.decisions.find(isShiningBlastTargetChoice)!.req;
    expect(choice.options?.candidateInstanceIds).toHaveLength(6);
    expect(choice.options?.max).toBe(3);
    const chosen = ["target4", "target5", "target6"].map((target) => s.perm(target).permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "chooseTargets", instanceIds: chosen },
      }),
    ).toEqual({ ok: true });
    await drainMicrotasks();

    expect(s.decisions.filter(isShiningBlastTargetChoice)).toHaveLength(1);
    expect(targets.map((target) => s.perm(target).currentDP)).toEqual([5000, 5000, 5000, 1000, 1000, 1000]);
  });
});
