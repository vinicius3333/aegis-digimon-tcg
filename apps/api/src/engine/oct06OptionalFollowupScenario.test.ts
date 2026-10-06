import { Phase, type DecisionResponse } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario, type DevScenarioId } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle, type EngineSetup, type SetupEngineOptions } from "./testkit/harness.js";

function launch(id: DevScenarioId, options: SetupEngineOptions = {}) {
  const s = setupEngine({ 0: {}, 1: {} }, options);
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  return { s, loop };
}
async function main(s: EngineSetup) {
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  await idle(s);
}
async function idle(s: EngineSetup) {
  await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && s.state.pendingDecision === undefined);
}
async function finish({ s, loop }: ReturnType<typeof launch>) {
  expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}
function respond(s: EngineSetup, response: DecisionResponse) {
  expect(
    s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: s.state.pendingDecision!.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}
async function plan(s: EngineSetup) {
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
  const keys = s.decisions.at(-1)!.req.options!.triggerKeys!;
  respond(s, { kind: "orderTriggers", order: keys, optionalAnswers: { [keys[0]!]: true, [keys[1]!]: false } });
}
function field(s: EngineSetup, cardId: string, seat: 0 | 1 = 0) {
  return s.state.players[seat]!.battleArea.find((p) => p.topCard.cardId === cardId)!;
}

it("Discord 1556998094070095964 arena: Blue Scramble leaves its only rookie in trash", async () => {
  const run = launch("arena-oct06-blue-scramble-decline", { autoOrderTriggers: false });
  const { s } = run;
  // Start-turn decisions precede Breeding; gameplay begins only after entering Main.
  await plan(s);
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  const returned = s.state.players[0]!.trash.find((c) => c.cardId === "BT1-027")!.instanceId;
  respond(s, { kind: "selectCards", instanceIds: [returned] });
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  expect(s.decisions.at(-1)!.req.options).toMatchObject({ min: 0, max: 1, purpose: "acceptedOptional" });
  respond(s, { kind: "selectCards", instanceIds: [] });
  await main(s);
  expect(s.state.players[0]!.trash.map((c) => c.cardId)).toContain("BT1-031");
  expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["LM-028"]);
  expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toContain(returned);
  await finish(run);
});

it("Discord 1556998094070095964 arena: Rina draws and can decline the sole evolution card", async () => {
  const options = { autoOrderTriggers: false };
  const run = launch("arena-oct06-rina-decline", options);
  const { s } = run;
  await plan(s);
  options.autoOrderTriggers = true;
  await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
  respond(s, { kind: "chooseTargets", instanceIds: [field(s, "BT3-021").permanentId] });
  await settle(() => s.state.pendingDecision?.kind === "selectCards");
  expect(s.decisions.at(-1)!.req.options).toMatchObject({ min: 0, max: 1, purpose: "acceptedOptional" });
  respond(s, { kind: "selectCards", instanceIds: [] });
  await main(s);
  expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "EX13-069" && p.isSuspended)).toHaveLength(
    1,
  );
  expect(field(s, "BT3-021")).toBeDefined();
  expect(s.state.players[0]!.hand.map((c) => c.cardId)).toContain("ST8-05");
  expect(s.state.players[0]!.deck).toHaveLength(18); // Rina's draw plus the Draw phase.
  await finish(run);
});

it("Discord 1557002713047502968 arena: an unsuspended Vortex keeps OPT after declining Battle", async () => {
  const declinePrompts = ["Battle"];
  const preferred: string[] = [];
  const run = launch("arena-oct06-vortex-opt-decline", {
    autoAcceptOptional: true,
    autoSelectCards: true,
    declinePrompts,
    preferInstanceIds: preferred,
  });
  const { s } = run;
  await main(s);
  const cannons = s.state.players[0]!.hand.filter((c) => c.cardId === "BT1-110");
  preferred.push(field(s, "BT1-009", 1).permanentId);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: cannons[0]!.instanceId })).toEqual({ ok: true });
  await idle(s);
  expect(s.state.players[1]!.battleArea).toHaveLength(2);
  expect(field(s, "EX11-074").isSuspended).toBe(false);
  declinePrompts.length = 0;
  preferred.splice(0, preferred.length, field(s, "BT1-010", 1).permanentId);
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: cannons[1]!.instanceId })).toEqual({ ok: true });
  await idle(s);
  expect(s.state.players[1]!.trash.map((c) => c.cardId)).toContain("BT1-010");
  expect(
    s.events.filter(
      (e) => e.kind === "effectTriggered" && e.sourceCardId === "EX11-074" && e.timing === "whenSuspended",
    ),
  ).toHaveLength(1);
  expect(s.events.filter((e) => e.kind === "securityChecked")).toHaveLength(0);
  await finish(run);
});

it.each(["BT1-009", "BT1-010"])(
  "Discord 1557002713047502968 arena: effect attack directly battles %s before confirming its target",
  async (directTarget) => {
    const run = launch("arena-oct06-vortex-piercing-controls", {
      autoAcceptOptional: true,
      declinePrompts: ["Suspend"],
    });
    const { s } = run;
    await main(s);
    const attackTarget = field(s, "BT1-010", 1).permanentId;
    const directId = field(s, directTarget, 1).permanentId;
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    respond(s, { kind: "selectCards", instanceIds: [attackTarget] });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    respond(s, { kind: "chooseTargets", instanceIds: [directId] });
    await settle(() => s.events.some((e) => e.kind === "attackEnded") && s.state.pendingDecision === undefined);
    expect(s.events.filter((e) => e.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash.map((c) => c.cardId)).toContain(directTarget);
    await finish(run);
  },
);
