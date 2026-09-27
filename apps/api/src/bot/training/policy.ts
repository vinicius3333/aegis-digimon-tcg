import type { DecisionRequest, Intent, Seat } from "@aegis/shared";
import type { GameEngine } from "../../engine/GameEngine.js";
import type { BotPolicy } from "../policy.js";
import { breedingActions, mainActions, type TrainingAction } from "./actions.js";
import { chooseDecisionIntent } from "./decisions.js";
import { selectionCards, trainingObservation, type TrainingObservation } from "./observation.js";

export interface TrainingWindow {
  observation: TrainingObservation;
  kind: string;
  request?: DecisionRequest;
  selected: readonly string[];
  actions: readonly TrainingAction[];
}

export type ChooseTrainingAction = (window: TrainingWindow) => number;

export function createTrainingPolicy(engine: GameEngine, seat: Seat, choose: ChooseTrainingAction): BotPolicy {
  const take = (kind: string, actions: TrainingAction[]): Intent => {
    const index = choose({ observation: trainingObservation(engine.state, seat), kind, selected: [], actions });
    if (!Number.isInteger(index) || index < 0 || index >= actions.length)
      throw new Error(`Invalid training action index ${index}`);
    return actions[index]!.intent;
  };
  const binary = (type: "respondEvade" | "respondBarrier", permanentId: string): Intent =>
    take(
      type,
      [true, false].map((accept) => ({
        intent: { type, permanentId, accept },
        label: accept ? "Accept" : "Decline",
        sourceId: permanentId,
      })),
    );
  return {
    name: "training:external",
    onTurnStart() {},
    chooseBreedingAction: () => take("breeding", breedingActions(engine, seat)),
    chooseMainAction: () => take("main", mainActions(engine, seat)),
    chooseBlockResponse: (_view, context) =>
      take("block", [
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
      ]),
    chooseCounterResponse: (_view, context) =>
      take("counter", [
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
      ]),
    chooseAllianceResponse: (_view, context) =>
      take("alliance", [
        { intent: { type: "respondAlliance" }, label: "Decline alliance", targetId: context.permanentId },
        ...context.eligibleAllyIds.map((allyPermanentId) => ({
          intent: { type: "respondAlliance", allyPermanentId } as Intent,
          label: "Alliance",
          sourceId: allyPermanentId,
          targetId: context.permanentId,
        })),
      ]),
    chooseEvadeResponse: (_view, permanentId) => binary("respondEvade", permanentId),
    chooseBarrierResponse: (_view, permanentId) => binary("respondBarrier", permanentId),
    answerDecision: (_view, request) => {
      const observation = trainingObservation(engine.state, seat, request);
      return chooseDecisionIntent(request, selectionCards(observation), (step) =>
        choose({
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
        }),
      );
    },
    noteRejected(intent) {
      throw new Error(`Training action rejected: ${JSON.stringify(intent)}`);
    },
  };
}
