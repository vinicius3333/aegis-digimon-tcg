import { Phase, type Intent } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import type { IssueReproScenarioId } from "./issueReproScenarios.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { observe } from "./testkit/observe.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "./testkit/harness.js";

async function launch(id: IssueReproScenarioId, autoSelectCards = true) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    {
      autoAcceptOptional: true,
      autoSelectCards,
      autoChooseOption: true,
      autoOrderTriggers: true,
    },
  );
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  const act = (intent: Intent, seat = 0) => expect(s.engine.applyIntent(seat as 0 | 1, intent)).toEqual({ ok: true });
  return {
    ...s,
    act,
    field: (cardId: string, seat = 0) => s.state.players[seat]!.battleArea.find((p) => p.topCard.cardId === cardId)!,
    hand: (cardId: string) => s.state.players[0]!.hand.find((c) => c.cardId === cardId)!,
    idle: async () => {
      await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
      expect(s.state.pendingDecision).toBeUndefined();
    },
    finish: async () => {
      if (s.state.phase === Phase.Breeding) {
        act({ type: "endPhase" }, s.state.turnSeat);
        await advance(s.engine).waitForMainPhase(s.state.turnSeat);
      }
      expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  };
}

it("#5179 ordinary evolution from Paildramon passes memory, declares Blitz, and leaves both opponents alive", async () => {
  const s = await launch("arena-issue-5179-imperialdramon-blitz");
  s.act({ type: "digivolve", permanentId: s.field("BT20-016").permanentId, instanceId: s.hand("EX3-063").instanceId });
  await settle(() => s.engine.pendingBlitzAttack !== undefined);
  s.act({ type: "attack", attackerPermanentId: s.field("EX3-063").permanentId, target: { kind: "player" } });
  await advance(s.engine).finishAttack();
  await settleAcrossTimers(() => s.state.players[1]!.security.length === 1);
  await s.idle();
  expect(s.state.players[1]!.battleArea).toHaveLength(2);
  expect(s.events.some((e) => e.kind === "attackDeclared")).toBe(true);
  expect(s.events.some((e) => e.kind === "securityChecked")).toBe(true);
  await s.finish();
});

it("#5190/#5192 Tapmon combines with Bootmon's effect discount at zero memory and resolves Shutmon's link", async () => {
  const s = await launch("arena-issue-5190-tapmon-bootmon");
  s.act({
    type: "appFusion",
    permanentId: s.field("BT25-052").permanentId,
    instanceId: s.hand("BT25-056").instanceId,
    linkedInstanceId: s.field("BT25-052").linked[0]!.instanceId,
  });
  await settle(() => s.field("BT25-056")?.linked.some((c) => c.cardId === "BT25-072"));
  await s.idle();
  expect(s.field("BT25-056").linked.some((c) => c.cardId === "BT25-072")).toBe(true);
  expect(s.state.memory).toBe(0);
  expect(s.decisions.some((d) => d.req.promptText === "Reduce this Link cost by 1?")).toBe(true);
  expect(s.state.players[1]!.battleArea.some((p) => p.isSuspended)).toBe(true);
  for (const target of s.state.players[1]!.battleArea)
    expect(observe(s.engine).hasRestriction(target, "unsuspend")).toBe(true);
  await s.finish();
});

it("#5193/#5194 newly played Alphamon cannot attack but can reactivate When Digivolving and completes resolution", async () => {
  const s = await launch("arena-issue-5194-alphamon-entry", false);
  s.act({ type: "playCard", instanceId: s.hand("EX13-060").instanceId });
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  const decision = s.state.pendingDecision!;
  const options = JSON.parse(decision.payloadJson);
  expect(options.candidateInstanceIds).toHaveLength(2);
  expect(options.selectionContext).not.toBe("attackSource");
  s.act({
    type: "respondDecision",
    decisionId: decision.decisionId,
    response: { kind: "chooseTargets", instanceIds: [s.field("BT1-080", 1).permanentId] },
  });
  await settle(() => s.field("BT1-080", 1).currentDP === 4000);
  await s.idle();
  expect(s.events.some((e) => e.kind === "attackDeclared")).toBe(false);
  expect(s.field("EX13-060").isSuspended).toBe(false);
  expect(s.field("BT1-080", 1).currentDP).toBe(4000);
  await s.finish();
});

it.each(["BT22-013", "BT22-026"])(
  "#5185 Nokia enables the projected Hand Main warp of %s over EX4 dual-name rookies",
  async (id) => {
    const s = await launch("arena-issue-5185-nokia-warp");
    const hand = s.hand(id);
    const effects = JSON.parse(hand.activatableEffectsJson) as { effectKey: string }[];
    expect(effects).not.toHaveLength(0);
    s.act({ type: "activateEffect", sourceInstanceId: hand.instanceId, effectKey: effects[0]!.effectKey });
    await settle(() => s.field(id) !== undefined);
    await s.idle();
    expect(s.field(id)).toBeDefined();
    expect(s.state.memory).toBe(5);
    await s.finish();
  },
);

it("#5196 Kyubimon searches after evolution in the live turn loop", async () => {
  const s = await launch("arena-issue-5196-kyubimon-search");
  s.act({ type: "digivolve", permanentId: s.field("ST22-02").permanentId, instanceId: s.hand("ST22-03").instanceId });
  await settle(() => s.state.players[0]!.hand.some((c) => c.cardId === "ST22-05"));
  await s.idle();
  expect(
    s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "ST22-03" && e.timing === "WhenDigivolving"),
  ).toBe(true);
  await s.finish();
});

it("#5199 playing Sistermon from trash still requires the Option target selection before her On Play", async () => {
  const s = await launch("arena-issue-5199-sistermon-option", false);
  s.act({ type: "playCard", instanceId: s.hand("EX13-066").instanceId, useAs: "option" });
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const play = s.state.pendingDecision!;
  const ciel = s.state.players[0]!.trash.find((card) => card.cardId === "BT23-077")!;
  s.act({
    type: "respondDecision",
    decisionId: play.decisionId,
    response: { kind: "selectCards", instanceIds: [ciel.instanceId] },
  });
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  const target = s.state.pendingDecision!;
  expect(JSON.parse(target.payloadJson).candidateInstanceIds).toHaveLength(2);
  expect(s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT23-077")).toBe(false);
  s.act({
    type: "respondDecision",
    decisionId: target.decisionId,
    response: { kind: "chooseTargets", instanceIds: [s.field("BT2-027", 1).permanentId] },
  });
  await settleAcrossTimers(() => s.state.pendingDecision?.kind === "selectCards");
  const arts = s.state.pendingDecision!;
  expect(arts.promptText).toContain("Arts Digivolve");
  s.act({ type: "respondDecision", decisionId: arts.decisionId, response: { kind: "selectCards", instanceIds: [] } });
  await s.idle();
  expect(s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "BT23-077")).toBe(true);
  expect(s.field("BT23-077")).toBeDefined();
  expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-010")).toBe(false);
  await s.finish();
});
