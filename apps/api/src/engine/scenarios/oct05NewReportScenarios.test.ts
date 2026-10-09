import { Phase, type Seat } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import type { IssueReproScenarioId } from "../issueReproScenarios.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, type SetupEngineOptions } from "../testkit/harness.js";
async function start(id: IssueReproScenarioId, options: SetupEngineOptions = {}) {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, ...options },
  );
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}
async function finish({ s, loop }: Awaited<ReturnType<typeof start>>) {
  expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}
function hand(s: ReturnType<typeof setupEngine>, id: string) {
  return s.state.players[0]!.hand.find((c) => c.cardId === id)!;
}
function field(s: ReturnType<typeof setupEngine>, id: string, seat: Seat = 0) {
  return s.state.players[seat]!.battleArea.find((p) => p.topCard.cardId === id)!;
}
async function idle(s: ReturnType<typeof setupEngine>) {
  await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);
}
it.each([
  ["arena-issue-4999-mother-option-color", "BT24-100", 5],
  ["arena-issue-5000-mother-marsmon-cost", "BT25-020", 3],
] as const)("%s runs the reduced Mother D-Reaper board", async (id, card, memory) => {
  const run = await start(id);
  const { s } = run;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, card).instanceId })).toEqual({ ok: true });
  await idle(s);
  expect(s.state.memory).toBe(memory);
  await finish(run);
});
it("#5001 arena searches Vikemon using its printed Sea Beast Rule", async () => {
  const run = await start("arena-issue-5001-gomamon-vikemon-search");
  const { s } = run;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "EX8-018").instanceId })).toEqual({
    ok: true,
  });
  await idle(s);
  expect(hand(s, "LM-040")).toBeDefined();
  await finish(run);
});
it("#5004 arena returns ST24 Marcus for zero-cost Burst Digivolution", async () => {
  const run = await start("arena-issue-5004-shine-burst-marcus", {
    autoAcceptOptional: false,
    autoDeclineOptional: true,
  });
  const { s } = run;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: field(s, "ST24-07").permanentId,
      instanceId: hand(s, "BT25-104").instanceId,
      alternateRequirementIndex: 1,
    }),
  ).toEqual({ ok: true });
  await idle(s);
  expect(hand(s, "ST24-13")).toBeDefined();
  expect(s.state.memory).toBe(8);
  await finish(run);
});
it("#5007 arena orders Shakkoumon before Armor Purge and plays its level 4", async () => {
  const run = await start("arena-issue-5007-armor-shakkoumon-order", { preferTriggerKeys: ["BT23-032"] });
  const { s } = run;
  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: field(s, "BT16-102").permanentId,
      target: { kind: "permanent", permanentId: field(s, "BT1-084", 1).permanentId },
    }),
  ).toEqual({ ok: true });
  await advance(s.engine).finishAttack();
  await idle(s);
  expect(field(s, "BT1-051")).toBeDefined();
  expect(field(s, "BT23-032")).toBeDefined();
  await finish(run);
});
it("#5008 arena completes the mandatory hand discard and releases Main", async () => {
  const run = await start("arena-issue-5008-hand-trash-selection");
  const { s } = run;
  const before = s.state.players[0]!.hand.length;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: field(s, "BT2-078").permanentId,
      instanceId: hand(s, "EX7-062").instanceId,
    }),
  ).toEqual({ ok: true });
  await idle(s);
  expect(s.state.players[0]!.trash).toHaveLength(2);
  expect(s.state.players[0]!.hand).toHaveLength(before - 2);
  await finish(run);
});
it("#5009 arena excludes Pipe Fox from AeroVeedramon's level-based return", async () => {
  const run = await start("arena-issue-5009-pipe-fox-no-level");
  const { s } = run;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "BT22-023").instanceId })).toEqual({
    ok: true,
  });
  await idle(s);
  expect(field(s, "TOKEN-Pipe-Fox", 1)).toBeDefined();
  await finish(run);
});
it("#5010 arena draws through Kapurimon after Espimon's breeding move", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  layDevScenario("arena-issue-5010-kapurimon-security-flip", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding);
  const before = s.state.players[0]!.hand.length;
  expect(
    s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.state.players[0]!.breeding!.permanentId }),
  ).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  expect(s.state.players[1]!.security[0]!.faceUp).toBe(true);
  expect(s.state.players[0]!.hand).toHaveLength(before + 1);
  await finish({ s, loop });
});
it("#5003 arena keeps the mandatory Bacchusmon tail after suspension is declined", async () => {
  const run = await start("arena-issue-5003-bacchus-pending-effects", { autoSelectCards: false });
  const { s } = run;
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const play = s.decisions.at(-1)!.req;
  const demi = s.state.players[0]!.trash.find((c) => c.cardId === "BT2-067")!;
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: play.decisionId,
      response: { kind: "selectCards", instanceIds: [demi.instanceId] },
    }),
  ).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  const suspend = s.decisions.at(-1)!.req;
  expect(
    s.engine.applyIntent(1, {
      type: "respondDecision",
      decisionId: suspend.decisionId,
      response: { kind: "chooseTargets", instanceIds: [] },
    }),
  ).toEqual({ ok: true });
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s, "BT1-009").instanceId })).toEqual({
    ok: false,
    reason: "wrong-phase",
  });
  await settle(() => s.state.turnSeat === 1);
  expect(s.state.players[0]!.trash.some((c) => c.instanceId === demi.instanceId)).toBe(true);
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(1);
  await finish(run);
});
it("#5005 arena consumes Mococomon once across the effect-directed attack", async () => {
  const preferred: string[] = [];
  const run = await start("arena-issue-5005-mococomon-forced-attack", {
    preferInstanceIds: preferred,
    preferTriggerKeys: ["EX12-056"],
    declineDigiXros: true,
    declinePrompts: ["Play 1 [Kotenken]"],
  });
  const { s } = run;
  preferred.push(hand(s, "EX12-056").instanceId);
  const susanoo = hand(s, "EX12-076").instanceId;
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: field(s, "EX12-043").permanentId,
      instanceId: hand(s, "EX12-045").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle();
  await advance(s.engine).finishAttack();
  await idle(s);
  expect(s.events.filter((e) => e.kind === "effectResolved" && e.sourceCardId === "EX12-002")).toHaveLength(1);
  expect(s.state.players[0]!.hand.some((c) => c.instanceId === susanoo)).toBe(true);
  await finish(run);
});
