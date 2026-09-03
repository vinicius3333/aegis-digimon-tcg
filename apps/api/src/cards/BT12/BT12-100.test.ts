import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-100.js";

describe("BT12-100 compiled IR module", () => {
  it("registers its Main and Security clauses through the declarative record", () => {
    const module = getEffectModule("BT12-100");
    expect(module?.cardId).toBe("BT12-100");
    const source = {
      instanceId: "source-100",
      cardId: "BT12-100",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnUseOption, source).length).toBeGreaterThan(0);
  });
});

it("registers and resolves the printed Security deletion", async () => {
  const module = getEffectModule("BT12-100");
  const source = { instanceId: "source-100", cardId: "BT12-100", ownerSeat: 0, isOnBattleArea: () => false } as never;
  expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  const s = setupEngine(
    {
      0: { security: [{ card: "BT12-100", as: "option", faceUp: true }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 12000 }] },
    },
    { autoSelectCards: true },
  );
  await s.ready();
  await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
});

it("can decline the optional player attack after unsuspending Shoutmon X7", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT12-100", as: "option" }],
        battleArea: [{ card: "BT12-112", as: "shoutmon", suspended: true }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }] },
    },
    { autoDeclineOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 9;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() => s.perm("shoutmon").isSuspended === false);
  expect(s.perm("shoutmon").isSuspended).toBe(false);
  expect(observe(s.engine).isAttacking()).toBe(false);
});

it("deletes an opposing Digimon and lets a Shoutmon X7: Superior Mode attack", async () => {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "BT12-100", as: "option" }],
        battleArea: [{ card: "BT12-112", as: "shoutmon", suspended: true }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], security: ["BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 9;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(
    () =>
      s.state.players[1]!.battleArea.length === 0 &&
      s.state.players[1]!.security.length === 0 &&
      !observe(s.engine).isAttacking(),
  );
  expect(s.state.players[1]!.battleArea).toHaveLength(0);
  expect(s.perm("shoutmon").isSuspended).toBe(true);
  expect(s.state.players[1]!.security).toHaveLength(0);
  expect(s.decisions.some(({ req }) => req.sourceCardId === "BT12-100")).toBe(true);
});

it("prompts for the Shoutmon X7 target when more than one is present", async () => {
  const s = setupEngine({
    0: {
      hand: [{ card: "BT12-100", as: "option" }],
      battleArea: [
        { card: "BT12-112", as: "firstShoutmon", suspended: true },
        { card: "BT12-112", as: "secondShoutmon", suspended: true },
      ],
    },
    1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }] },
  });
  await s.ready();
  s.state.memory = 9;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
  await settle(() =>
    s.decisions.some(
      ({ req }) =>
        req.sourceCardId === "BT12-100" &&
        req.kind === "chooseTargets" &&
        req.options?.candidateInstanceIds?.length === 2,
    ),
  );
  expect(s.state.players[1]!.battleArea).toHaveLength(0);

  const choice = s.decisions.find(
    ({ req }) =>
      req.sourceCardId === "BT12-100" &&
      req.kind === "chooseTargets" &&
      req.options?.candidateInstanceIds?.length === 2,
  )!.req;
  expect(choice.options?.candidateInstanceIds).toEqual([
    s.perm("firstShoutmon").permanentId,
    s.perm("secondShoutmon").permanentId,
  ]);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: choice.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("secondShoutmon").permanentId] },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "optional");
  const attackChoice = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: attackChoice.decisionId,
      response: { kind: "optional", accept: false },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision === undefined);
  expect(s.perm("firstShoutmon").isSuspended).toBe(true);
  expect(s.perm("secondShoutmon").isSuspended).toBe(false);
  expect(observe(s.engine).isAttacking()).toBe(false);
});
