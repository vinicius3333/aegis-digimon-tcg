import type { DecisionRequest, Intent, Seat } from "@aegis/shared";
import type { GameEngine } from "../../engine/GameEngine.js";
import type { BotPolicy } from "../policy.js";
import { createObservationHistory } from "./history.js";
import { teacherActionIndex } from "./teacher.js";
import { breedingActions, mainActions, type TrainingAction } from "./actions.js";
import { decisionSteps } from "./decisions.js";
import { selectionCards, trainingObservation, type TrainingObservation } from "./observation.js";

export interface TrainingWindow {
  observation: TrainingObservation;
  kind: string;
  teacher?: { action: number | null };
  combat?: { targetsPlayer: boolean; mustBlock: boolean; targetPermanentId?: string };
  request?: DecisionRequest;
  selected: readonly string[];
  actions: readonly TrainingAction[];
}

export type ChooseTrainingAction = (window: TrainingWindow) => number;

type TrainingSteps = Generator<TrainingWindow, Intent, number>;
export type ChooseAsyncTrainingAction = (window: TrainingWindow, signal: AbortSignal) => Promise<number>;

export function createTrainingPolicy(
  engine: GameEngine,
  seat: Seat,
  choose: ChooseTrainingAction,
  teacher?: BotPolicy,
): BotPolicy {
  return buildTrainingPolicy(
    engine,
    seat,
    (steps) => {
      let step = steps.next();
      while (!step.done) step = steps.next(choose(step.value));
      return step.value;
    },
    teacher,
  );
}

export function createAsyncTrainingPolicy(
  engine: GameEngine,
  seat: Seat,
  choose: ChooseAsyncTrainingAction,
  teacher?: BotPolicy,
): BotPolicy<Promise<Intent>> {
  return buildTrainingPolicy(
    engine,
    seat,
    async (steps, signal = new AbortController().signal) => {
      signal.throwIfAborted();
      let step = steps.next();
      while (!step.done) {
        signal.throwIfAborted();
        const index = await choose(step.value, signal);
        signal.throwIfAborted();
        step = steps.next(index);
      }
      return step.value;
    },
    teacher,
  );
}

function buildTrainingPolicy<Result extends Intent | Promise<Intent>>(
  engine: GameEngine,
  seat: Seat,
  run: (steps: TrainingSteps, signal?: AbortSignal) => Result,
  teacher?: BotPolicy,
): BotPolicy<Result> {
  const history = createObservationHistory();
  const observe = (request?: DecisionRequest): TrainingObservation => {
    const observation = trainingObservation(engine.state, seat, request);
    history.observe(observation);
    return { ...observation, history: history.snapshot() };
  };
  const withTeacher = (window: TrainingWindow, intent?: Intent): TrainingWindow =>
    intent === undefined ? window : { ...window, teacher: { action: teacherActionIndex(window, intent) ?? null } };
  function* actionSteps(
    kind: string,
    actions: TrainingAction[],
    combat?: TrainingWindow["combat"],
    demonstration?: Intent,
  ): TrainingSteps {
    const index = yield withTeacher(
      {
        observation: observe(),
        kind,
        selected: [],
        actions,
        ...(combat === undefined ? {} : { combat }),
      },
      demonstration,
    );
    if (!Number.isInteger(index) || index < 0 || index >= actions.length)
      throw new Error(`Invalid training action index ${index}`);
    return actions[index]!.intent;
  }
  const take = (
    kind: string,
    actions: TrainingAction[],
    combat?: TrainingWindow["combat"],
    demonstration?: Intent,
    signal?: AbortSignal,
  ): Result => run(actionSteps(kind, actions, combat, demonstration), signal);
  const binary = (
    type: "respondEvade" | "respondBarrier",
    permanentId: string,
    demonstration?: Intent,
    signal?: AbortSignal,
  ): Result =>
    take(
      type,
      [true, false].map((accept) => ({
        intent: { type, permanentId, accept },
        label: accept ? "Accept" : "Decline",
        sourceId: permanentId,
      })),
      undefined,
      demonstration,
      signal,
    );
  return {
    name: "training:external",
    observeEvent: (event) => {
      history.observeEvent(event);
      teacher?.observeEvent?.(event);
    },
    onTurnStart() {
      teacher?.onTurnStart();
    },
    chooseBreedingAction: (view, signal) =>
      take("breeding", breedingActions(engine, seat), undefined, teacher?.chooseBreedingAction(view), signal),
    chooseMainAction: (view, signal) =>
      take("main", mainActions(engine, seat), undefined, teacher?.chooseMainAction(view), signal),
    chooseBlockResponse: (view, context, signal) =>
      take(
        "block",
        [
          ...(context.mustBlock
            ? []
            : [
                {
                  intent: { type: "declineBlock" } as Intent,
                  label: "Decline block",
                  targetId: context.attackerPermanentId,
                },
              ]),
          ...context.eligibleBlockerIds.map((blockerPermanentId) => ({
            intent: { type: "declareBlock", blockerPermanentId } as Intent,
            label: "Block",
            sourceId: blockerPermanentId,
            targetId: context.attackerPermanentId,
          })),
        ],
        {
          targetsPlayer: context.targetsPlayer,
          mustBlock: context.mustBlock,
          ...(context.targetPermanentId === undefined ? {} : { targetPermanentId: context.targetPermanentId }),
        },
        teacher?.chooseBlockResponse(view, context),
        signal,
      ),
    chooseCounterResponse: (view, context, signal) =>
      take(
        "counter",
        [
          { intent: { type: "respondCounter" }, label: "Decline counter", targetId: context.attackerPermanentId },
          ...context.eligibleCounters.map((counter) => ({
            intent: {
              type: "respondCounter",
              sourceInstanceId: counter.instanceId,
              effectKey: counter.effectKey,
            } as Intent,
            label: counter.description,
            sourceId: counter.instanceId,
            targetId: context.attackerPermanentId,
          })),
        ],
        undefined,
        teacher?.chooseCounterResponse(view, context),
        signal,
      ),
    chooseAllianceResponse: (view, context, signal) =>
      take(
        "alliance",
        [
          { intent: { type: "respondAlliance" }, label: "Decline alliance", targetId: context.permanentId },
          ...context.eligibleAllyIds.map((allyPermanentId) => ({
            intent: { type: "respondAlliance", allyPermanentId } as Intent,
            label: "Alliance",
            sourceId: allyPermanentId,
            targetId: context.permanentId,
          })),
        ],
        undefined,
        teacher?.chooseAllianceResponse(view, context),
        signal,
      ),
    chooseEvadeResponse: (view, permanentId, signal) =>
      binary("respondEvade", permanentId, teacher?.chooseEvadeResponse(view, permanentId), signal),
    chooseBarrierResponse: (view, permanentId, signal) =>
      binary("respondBarrier", permanentId, teacher?.chooseBarrierResponse(view, permanentId), signal),
    answerDecision: (view, request, signal) => {
      const demonstration = teacher?.answerDecision(view, request);
      const observation = observe(request);
      function* selections(): TrainingSteps {
        const steps = decisionSteps(request, selectionCards(observation));
        let step = steps.next();
        while (!step.done) {
          const index = yield withTeacher(
            {
              observation,
              kind: request.kind,
              request,
              selected: step.value.selected,
              actions: step.value.choices.map((choice) => ({
                // Subselection intents are private bridge markers and never reach the engine.
                intent: choice.intent ?? {
                  type: "respondDecision",
                  decisionId: request.decisionId,
                  response: {
                    kind: "selectCards",
                    instanceIds: choice.referenceId === undefined ? [] : [choice.referenceId],
                  },
                },
                label: choice.label,
                ...(choice.referenceId === undefined ? {} : { sourceId: choice.referenceId }),
              })),
            },
            demonstration,
          );
          step = steps.next(index);
        }
        return step.value;
      }
      return run(selections(), signal);
    },
    noteRejected(intent) {
      throw new Error(`Training action rejected: ${JSON.stringify(intent)}`);
    },
  };
}
