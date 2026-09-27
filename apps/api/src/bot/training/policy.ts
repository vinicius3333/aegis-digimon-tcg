import type { DecisionRequest, Intent, Seat } from "@aegis/shared";
import type { GameEngine } from "../../engine/GameEngine.js";
import type { BotPolicy } from "../policy.js";
import { teacherActionIndex } from "./teacher.js";
import { breedingActions, mainActions, type TrainingAction } from "./actions.js";
import { chooseDecisionIntent } from "./decisions.js";
import { selectionCards, trainingObservation, type TrainingObservation } from "./observation.js";

export interface TrainingWindow {
  observation: TrainingObservation;
  kind: string;
  teacher?: { action: number | null };
  combat?: { targetsPlayer: boolean; mustBlock: boolean };
  request?: DecisionRequest;
  selected: readonly string[];
  actions: readonly TrainingAction[];
}

export type ChooseTrainingAction = (window: TrainingWindow) => number;

export function createTrainingPolicy(
  engine: GameEngine,
  seat: Seat,
  choose: ChooseTrainingAction,
  teacher?: BotPolicy,
): BotPolicy {
  const chooseWithTeacher = (window: TrainingWindow, intent?: Intent): number => {
    return choose(
      intent === undefined
        ? window
        : {
            ...window,
            teacher: { action: teacherActionIndex(window, intent) ?? null },
          },
    );
  };
  const take = (
    kind: string,
    actions: TrainingAction[],
    combat?: TrainingWindow["combat"],
    demonstration?: Intent,
  ): Intent => {
    const index = chooseWithTeacher(
      {
        observation: trainingObservation(engine.state, seat),
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
  };
  const binary = (type: "respondEvade" | "respondBarrier", permanentId: string, demonstration?: Intent): Intent =>
    take(
      type,
      [true, false].map((accept) => ({
        intent: { type, permanentId, accept },
        label: accept ? "Accept" : "Decline",
        sourceId: permanentId,
      })),
      undefined,
      demonstration,
    );
  return {
    name: "training:external",
    onTurnStart() {
      teacher?.onTurnStart();
    },
    chooseBreedingAction: (view) =>
      take("breeding", breedingActions(engine, seat), undefined, teacher?.chooseBreedingAction(view)),
    chooseMainAction: (view) => take("main", mainActions(engine, seat), undefined, teacher?.chooseMainAction(view)),
    chooseBlockResponse: (view, context) =>
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
        { targetsPlayer: context.targetsPlayer, mustBlock: context.mustBlock },
        teacher?.chooseBlockResponse(view, context),
      ),
    chooseCounterResponse: (view, context) =>
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
      ),
    chooseAllianceResponse: (view, context) =>
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
      ),
    chooseEvadeResponse: (view, permanentId) =>
      binary("respondEvade", permanentId, teacher?.chooseEvadeResponse(view, permanentId)),
    chooseBarrierResponse: (view, permanentId) =>
      binary("respondBarrier", permanentId, teacher?.chooseBarrierResponse(view, permanentId)),
    answerDecision: (view, request) => {
      const demonstration = teacher?.answerDecision(view, request);
      const observation = trainingObservation(engine.state, seat, request);
      return chooseDecisionIntent(request, selectionCards(observation), (step) =>
        chooseWithTeacher(
          {
            observation,
            kind: request.kind,
            request,
            selected: step.selected,
            actions: step.choices.map((choice) => ({
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
        ),
      );
    },
    noteRejected(intent) {
      throw new Error(`Training action rejected: ${JSON.stringify(intent)}`);
    },
  };
}
