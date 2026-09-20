import { ArraySchema } from "@colyseus/schema";
import { EffectTiming, GameState, PlayerState, type DecisionResponse } from "@aegis/shared";
import type { DecisionExecutionFrame } from "../../engine/decisions/index.js";
import { GameEngine } from "../../engine/GameEngine.js";
import type { CollectedEffect } from "../../engine/effects/collect.js";
import { MulliganCoordinator, type MulliganExecutionFrame } from "../../engine/mulligan.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";

const apiScenarios = [
  "optional",
  "chooseTargets",
  "selectCards",
  "selectPermanents",
  "orderCards",
  "chooseOption",
] as const;
type ApiScenario = (typeof apiScenarios)[number];

interface FrameCase {
  readonly frame: DecisionExecutionFrame | MulliganExecutionFrame;
  readonly sourceResult: unknown;
  readonly sourceContinuation: unknown;
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  if (mode === "origin") {
    const cases: Record<string, FrameCase> = {};
    for (const scenario of apiScenarios) cases[scenario] = await exportApiScenario(scenario);
    cases.resolverOptional = await exportResolverOptionalScenario();
    cases.mulliganKeep = await exportMulliganScenario(true);
    cases.mulliganRedraw = await exportMulliganScenario(false);
    writeResult({ pid: process.pid, cases });
    return;
  }

  if (mode === "destination") {
    const input = JSON.parse(await readStdin()) as { cases: Record<string, FrameCase> };
    const cases: Record<string, { readonly continuation: unknown; readonly pendingCleared: boolean }> = {};
    for (const scenario of apiScenarios) {
      cases[scenario] = await resumeApiScenario(scenario, input.cases[scenario]!.frame as DecisionExecutionFrame);
    }
    cases.resolverOptional = await resumeResolverOptionalScenario(
      input.cases.resolverOptional!.frame as DecisionExecutionFrame,
    );
    cases.mulliganKeep = await resumeMulliganScenario(input.cases.mulliganKeep!.frame as MulliganExecutionFrame, true);
    cases.mulliganRedraw = await resumeMulliganScenario(
      input.cases.mulliganRedraw!.frame as MulliganExecutionFrame,
      false,
    );
    writeResult({ pid: process.pid, cases });
    return;
  }

  throw new Error(`unknown decision API worker mode: ${String(mode)}`);
}

async function exportApiScenario(scenario: ApiScenario): Promise<FrameCase> {
  const runtime = createDecisionRuntime();
  const promise = requestApiScenario(runtime.api, runtime.context, scenario);
  await waitForDecision(runtime.manager);
  const frame = JSON.parse(JSON.stringify(runtime.engine.exportPendingDecisionExecutionFrame())) as DecisionExecutionFrame;
  const response = responseFor(scenario);
  if (!runtime.engine.applyIntent(0, { type: "respondDecision", decisionId: frame.request.decisionId, response }).ok) {
    throw new Error(`origin rejected the ${scenario} response`);
  }
  const sourceResult = await promise;
  // On the source process the original callsite Promise still owns its continuation. The raw
  // response mapping is inspected here only as the equality oracle for the migrated runtime.
  const sourceContinuation = runtime.manager.takeResumedExecutionFrameResult(frame.request.decisionId);
  return {
    frame,
    sourceResult,
    sourceContinuation,
  };
}

async function resumeApiScenario(
  scenario: ApiScenario,
  frame: DecisionExecutionFrame,
): Promise<{
  continuation: unknown;
  wrongSeatContinuation: unknown;
  wrongSeatAnswerAccepted: boolean;
  duplicateContinuation: unknown;
  duplicateAnswerAccepted: boolean;
  pendingCleared: boolean;
}> {
  const runtime = createDecisionRuntime();
  runtime.engine.restorePendingDecisionExecutionFrame(frame);
  const wrongSeatAnswerAccepted = runtime.engine.applyIntent(1, {
    type: "respondDecision",
    decisionId: frame.request.decisionId,
    response: responseFor(scenario),
  }).ok;
  const wrongSeatContinuation = runtime.engine.takeResumedDecisionExecutionFrameResult(frame.request.decisionId);
  if (
    !runtime.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: frame.request.decisionId,
      response: responseFor(scenario),
    }).ok
  ) {
    throw new Error(`destination rejected the ${scenario} response`);
  }
  const continuation = runtime.engine.takeResumedDecisionExecutionFrameResult(frame.request.decisionId);
  const duplicateAnswerAccepted = runtime.engine.applyIntent(0, {
    type: "respondDecision",
    decisionId: frame.request.decisionId,
    response: responseFor(scenario),
  }).ok;
  return {
    continuation,
    wrongSeatContinuation,
    wrongSeatAnswerAccepted,
    duplicateContinuation: runtime.engine.takeResumedDecisionExecutionFrameResult(frame.request.decisionId),
    duplicateAnswerAccepted,
    pendingCleared: runtime.state.pendingDecision === undefined,
  };
}

async function exportResolverOptionalScenario(): Promise<FrameCase> {
  const runtime = createDecisionRuntime();
  const promise = runtime.engine.resolverDecisions.askOptional(0, collectedEffect());
  await waitForDecision(runtime.manager);
  const frame = JSON.parse(JSON.stringify(runtime.engine.exportPendingDecisionExecutionFrame())) as DecisionExecutionFrame;
  if (
    !runtime.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: frame.request.decisionId,
      response: { kind: "optional", accept: true },
    }).ok
  ) {
    throw new Error("origin rejected the resolver optional response");
  }
  const sourceContinuation = runtime.manager.takeResumedExecutionFrameResult(frame.request.decisionId);
  return {
    frame,
    sourceResult: await promise,
    sourceContinuation,
  };
}

async function resumeResolverOptionalScenario(
  frame: DecisionExecutionFrame,
): Promise<{
  continuation: unknown;
  wrongSeatContinuation: unknown;
  wrongSeatAnswerAccepted: boolean;
  duplicateContinuation: unknown;
  duplicateAnswerAccepted: boolean;
  pendingCleared: boolean;
}> {
  const runtime = createDecisionRuntime();
  runtime.engine.restorePendingDecisionExecutionFrame(frame);
  const wrongSeatAnswerAccepted = runtime.engine.applyIntent(1, {
    type: "respondDecision",
    decisionId: frame.request.decisionId,
    response: { kind: "optional", accept: true },
  }).ok;
  const wrongSeatContinuation = runtime.engine.takeResumedDecisionExecutionFrameResult(frame.request.decisionId);
  if (
    !runtime.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: frame.request.decisionId,
      response: { kind: "optional", accept: true },
    }).ok
  ) {
    throw new Error("destination rejected the resolver optional response");
  }
  const continuation = runtime.engine.takeResumedDecisionExecutionFrameResult(frame.request.decisionId);
  const duplicateAnswerAccepted = runtime.engine.applyIntent(0, {
    type: "respondDecision",
    decisionId: frame.request.decisionId,
    response: { kind: "optional", accept: true },
  }).ok;
  return {
    continuation,
    wrongSeatContinuation,
    wrongSeatAnswerAccepted,
    duplicateContinuation: runtime.engine.takeResumedDecisionExecutionFrameResult(frame.request.decisionId),
    duplicateAnswerAccepted,
    pendingCleared: runtime.state.pendingDecision === undefined,
  };
}

async function exportMulliganScenario(keep: boolean): Promise<FrameCase> {
  const state = makeState();
  const coordinator = new MulliganCoordinator(state, { requestDecision: () => {} }, { executionFramesEnabled: true });
  const promise = coordinator.request(0);
  const frame = JSON.parse(JSON.stringify(coordinator.exportExecutionFrame())) as MulliganExecutionFrame;
  if (!coordinator.answer(0, keep)) throw new Error("origin rejected the mulligan answer");
  return {
    frame,
    sourceResult: await promise,
    sourceContinuation: coordinator.takeResumedExecutionFrameResult(frame.request.decisionId),
  };
}

async function resumeMulliganScenario(
  frame: MulliganExecutionFrame,
  keep: boolean,
): Promise<{
  continuation: unknown;
  duplicateContinuation: unknown;
  duplicateAnswerAccepted: boolean;
  pendingCleared: boolean;
}> {
  const state = makeState();
  const coordinator = new MulliganCoordinator(state, { requestDecision: () => {} }, { executionFramesEnabled: true });
  coordinator.restoreExecutionFrame(frame);
  if (!coordinator.answer(0, keep)) throw new Error("destination rejected the mulligan answer");
  return {
    continuation: coordinator.takeResumedExecutionFrameResult(frame.request.decisionId),
    duplicateContinuation: undefined,
    duplicateAnswerAccepted: false,
    pendingCleared: state.pendingDecision === undefined,
  };
}

function createDecisionRuntime(): {
  readonly state: GameState;
  readonly manager: GameEngine["decisions"];
  readonly api: GameEngine["decisionApi"];
  readonly engine: GameEngine;
  readonly context: EffectContext;
} {
  const state = makeState();
  const engine = new GameEngine(state, {
    seed: 17,
    requestDecision: () => {},
    emit: () => {},
    executionFramesEnabled: true,
  });
  const context = {
    source: {
      ownerSeat: 0,
      cardId: "BT1-010",
      instanceId: "effect-source",
      definition: { nameEn: "Frame proof" },
      permanent: () => undefined,
    },
    game: {},
  } as unknown as EffectContext;
  return { state, engine, manager: engine.decisions, api: engine.decisionApi, context };
}

function makeState(): GameState {
  const state = new GameState();
  state.players = new ArraySchema<PlayerState>();
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  return state;
}

function collectedEffect(): CollectedEffect {
  return {
    source: {
      cardId: "BT1-010",
      instanceId: "resolver-effect-source",
      permanent: () => undefined,
    } as CollectedEffect["source"],
    effect: {
      effectKey: "BT1-010/on-play",
      description: "Use the optional effect?",
      optional: true,
      isInherited: false,
      isSecurity: false,
      isLinked: false,
      maxPerTurn: -1,
    } as CollectedEffect["effect"],
    timing: EffectTiming.OnPlay,
  };
}

function requestApiScenario(
  api: GameEngine["decisionApi"],
  context: EffectContext,
  scenario: ApiScenario,
): Promise<unknown> {
  switch (scenario) {
    case "optional":
      return api.optional(context, "Use this effect?");
    case "chooseTargets":
      return api.chooseTargets(context, { candidates: ["target-a", "target-b"], min: 1, max: 1 });
    case "selectCards":
      return api.selectCards(context, { candidates: ["card-a", "card-b", "card-c"], min: 1, max: 2 });
    case "selectPermanents":
      return api.selectPermanents(context, { candidates: ["permanent-a", "permanent-b"], min: 1, max: 1 });
    case "orderCards":
      return api.orderCards!(context, { candidates: ["card-a", "card-b", "card-c"] });
    case "chooseOption":
      return api.chooseOption(context, ["first", "second", "third"]);
  }
}

function responseFor(scenario: ApiScenario): DecisionResponse {
  switch (scenario) {
    case "optional":
      return { kind: "optional", accept: true };
    case "chooseTargets":
      return { kind: "chooseTargets", instanceIds: ["target-b", "target-a"] };
    case "selectCards":
      return { kind: "selectCards", instanceIds: ["card-c", "card-a", "card-b"] };
    case "selectPermanents":
      return { kind: "chooseTargets", instanceIds: ["permanent-b", "permanent-a"] };
    case "orderCards":
      return { kind: "orderCards", order: ["card-c", "card-b", "card-a"] };
    case "chooseOption":
      return { kind: "chooseOption", optionIndex: 99 };
  }
}

async function waitForDecision(manager: GameEngine["decisions"]): Promise<void> {
  for (let attempt = 0; attempt < 20 && !manager.hasPending; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  if (!manager.hasPending) throw new Error("decision API did not open the expected prompt");
}

function writeResult(value: Record<string, unknown>): void {
  process.stdout.write(`HANDOFF_API_FRAME_RESULT:${JSON.stringify(value)}\n`);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
