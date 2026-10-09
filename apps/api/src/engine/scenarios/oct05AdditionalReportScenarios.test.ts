import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import type { IssueReproScenarioId } from "../issueReproScenarios.js";

async function start(id: IssueReproScenarioId, automatic = false) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoSelectCards: automatic, autoAcceptOptional: automatic, autoOrderCards: automatic },
  );
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}
it.each([
  ["arena-issue-5011-agumon-search", "EX9-007"],
  ["arena-issue-5011-gabumon-search", "EX9-014"],
] as const)("%s can add the sole version to hand in the ordinary turn loop", async (id, cardId) => {
  const { s, loop } = await start(id);
  const played = s.state.players[0]!.hand.find((c) => c.cardId === cardId)!;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: played.instanceId })).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const req = s.decisions.at(-1)!.req;
  const wanted = req.options!.visibleCards!.find((c) => c.cardId === cardId)!;
  expect(req.options!.candidateInstanceIds).toContain(wanted.instanceId);
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: req.decisionId,
      response: { kind: "selectCards", instanceIds: [wanted.instanceId] },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "orderCards");
  const order = s.decisions.at(-1)!.req;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: order.decisionId,
      response: { kind: "orderCards", order: order.options!.candidateInstanceIds! },
    }),
  ).toEqual({ ok: true });
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(wanted.instanceId);
  expect(s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === played.instanceId)!.stack).toHaveLength(0);
  expect(s.state.memory).toBe(5);
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
it("#5014 arena offers a zero-cost Cool Boy using Mother D-Reaper's field color", async () => {
  const { s, loop } = await start("arena-issue-5014-digital-gate-cool-boy", true);
  const gate = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "P-206")!;
  const delay = observe(s.engine)
    .activatableEffects(gate)
    .find((e) => /delay/i.test(e.description ?? ""))!;
  expect(
    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: delay.instanceId!,
      effectKey: delay.effectKey,
    }),
  ).toEqual({ ok: true });
  await settle(() => !s.state.pendingDecision && s.engine.mainVerbContinuationsInFlight === 0);
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT20-091")).toBe(true);
  expect(s.state.memory).toBe(8);
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
});
