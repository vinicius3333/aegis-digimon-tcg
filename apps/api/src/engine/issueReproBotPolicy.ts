import { createEvaluationPolicy, type BotPolicy } from "../bot/policy.js";

/** Deterministic opponent actions for an arena reproduction, using ordinary intents. */
export function createIssueReproBotPolicy(scenario: string | undefined): BotPolicy | undefined {
  if (scenario === "arena-github-5149-proto-form" || scenario === "arena-github-5144-mastemon-infermon") {
    const fallback = createEvaluationPolicy();
    const cardId = scenario === "arena-github-5149-proto-form" ? "BT6-095" : "BT22-059";
    return {
      ...fallback,
      name: `${scenario}-opponent`,
      chooseBreedingAction: () => ({ type: "endPhase" }),
      chooseMainAction(view) {
        const card = view.hand.find((candidate) => candidate.cardId === cardId);
        return card === undefined ? { type: "endPhase" } : { type: "playCard", instanceId: card.instanceId };
      },
    };
  }
  if (scenario === "arena-examon-bt23-partition-choice") {
    const fallback = createEvaluationPolicy();
    return {
      ...fallback,
      name: "examon-partition-choice-reproduction",
      answerDecision(view, request) {
        // Leave the Partition bodies in play instead of removing them with Imperialdramon's reactive effect.
        if (request.sourceCardId === "AD1-024" && request.options?.timing === "AllTurns") {
          if (request.kind === "optional")
            return {
              type: "respondDecision",
              decisionId: request.decisionId,
              response: { kind: "optional", accept: false },
            };
          if (request.kind === "orderTriggers") {
            return {
              type: "respondDecision",
              decisionId: request.decisionId,
              response: {
                kind: "orderTriggers",
                order: request.options?.triggerKeys ?? [],
                optionalAnswers: Object.fromEntries((request.options?.triggerKeys ?? []).map((key) => [key, false])),
              },
            };
          }
        }
        return fallback.answerDecision(view, request);
      },
      chooseBreedingAction: () => ({ type: "endPhase" }),
      chooseMainAction(view) {
        const into = view.hand.find((card) => card.cardId === "AD1-024");
        const base = view.board.find((unit) => unit.cardId === "AD1-011");
        if (into !== undefined && base !== undefined) {
          return { type: "digivolve", permanentId: base.permanentId, instanceId: into.instanceId };
        }
        return { type: "endPhase" };
      },
    };
  }
  if (scenario === "arena-discord-1556831312008974437-jesmon-gankoomon-immunity") {
    const fallback = createEvaluationPolicy();
    return {
      ...fallback,
      name: "jesmon-gankoomon-immunity-reproduction",
      chooseBreedingAction: () => ({ type: "endPhase" }),
      chooseMainAction(view) {
        const wing = view.hand.find((card) => card.cardId === "EX13-021");
        const base = view.board.find((unit) => unit.cardId === "EX13-018");
        if (wing !== undefined && base !== undefined) {
          return {
            type: "digivolve",
            permanentId: base.permanentId,
            instanceId: wing.instanceId,
            useAlternateCost: true,
          };
        }
        return { type: "endPhase" };
      },
    };
  }
  if (scenario !== "arena-discord-1556810241952194590-cerberusmon-alphamon") return undefined;
  const fallback = createEvaluationPolicy();
  return {
    ...fallback,
    name: "cerberusmon-alphamon-reproduction",
    chooseMainAction(view) {
      const option = view.hand.find((card) => card.cardId === "BT26-056");
      if (option !== undefined && view.opponentBoard.some((unit) => unit.cardId === "EX13-060")) {
        return { type: "playCard", instanceId: option.instanceId, useAs: "option" };
      }
      return fallback.chooseMainAction(view);
    },
  };
}
