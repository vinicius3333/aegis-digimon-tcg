import { createEvaluationPolicy, type BotPolicy } from "../bot/policy.js";

/** Deterministic opponent actions for an arena reproduction, using ordinary intents. */
export function createIssueReproBotPolicy(scenario: string | undefined): BotPolicy | undefined {
  if (
    scenario &&
    [
      "arena-raid-immune-atratusmon",
      "arena-shota-start-main-once",
      "arena-heat-training-option-freeze",
      "arena-crescemon-hexeblaumon-cost",
      "arena-neptunemon-holy-cost",
      "arena-wargrowlmon-evaded-block",
      "arena-toropiamon-vortex-control",
      "arena-climbmon-pistmon-play",
      "arena-sukamon-opponent-cost",
      "arena-tuwarmon-opponent-blocker",
      "arena-chuuchuumon-opponent-blocker",
    ].includes(scenario)
  ) {
    const fallback = createEvaluationPolicy();
    return {
      ...fallback,
      name: "recent-card-report-control",
      chooseBreedingAction: () => ({ type: "endPhase" }),
      chooseMainAction(view) {
        if (scenario === "arena-raid-immune-atratusmon") {
          const card = view.hand.find((c) => c.cardId === "ST23-09");
          const base = view.board.find((p) => p.cardId === "ST23-08");
          if (card && base) return { type: "digivolve", instanceId: card.instanceId, permanentId: base.permanentId };
        }

        if (scenario === "arena-sukamon-opponent-cost") {
          const gaia = view.hand.find((card) => card.cardId === "ST1-16");
          if (gaia) return { type: "playCard", instanceId: gaia.instanceId };
        }
        if (scenario === "arena-tuwarmon-opponent-blocker" || scenario === "arena-chuuchuumon-opponent-blocker") {
          const attacker = view.board.find((p) => p.canAttackPlayer && !p.suspended);
          if (attacker)
            return { type: "attack", attackerPermanentId: attacker.permanentId, target: { kind: "player" } };
        }
        return { type: "endPhase" };
      },
      chooseBlockResponse(view, context) {
        if (scenario === "arena-wargrowlmon-evaded-block") {
          const blocker = view.board.find(
            (p) => p.cardId === "EX13-023" && context.eligibleBlockerIds.includes(p.permanentId),
          );
          if (blocker) return { type: "declareBlock", blockerPermanentId: blocker.permanentId };
        }
        return fallback.chooseBlockResponse(view, context);
      },
      answerDecision(view, request) {
        if (scenario === "arena-wargrowlmon-evaded-block" && request.sourceCardId === "EX13-023") {
          if (request.kind === "chooseOption")
            return {
              type: "respondDecision",
              decisionId: request.decisionId,
              response: {
                kind: "chooseOption",
                optionIndex: Math.max(
                  0,
                  (request.options?.choices ?? []).findIndex((choice) => /^unsuspend/i.test(choice)),
                ),
              },
            };
          if (request.kind === "optional" && /return/i.test(request.promptText ?? ""))
            return {
              type: "respondDecision",
              decisionId: request.decisionId,
              response: { kind: "optional", accept: false },
            };
        }
        return fallback.answerDecision(view, request);
      },
    };
  }
  if (scenario === "arena-koto-grademon-pending-piercing" || scenario === "arena-koto-grademon-no-prior-battle") {
    const fallback = createEvaluationPolicy();
    return {
      ...fallback,
      name: "koto-protected-block-reproduction",
      chooseBlockResponse(view, context) {
        const blocker = view.board.find(
          (p) => p.cardId === "EX13-060" && context.eligibleBlockerIds.includes(p.permanentId),
        );
        return blocker
          ? { type: "declareBlock", blockerPermanentId: blocker.permanentId }
          : fallback.chooseBlockResponse(view, context);
      },
    };
  }
  if (scenario === "arena-github-5346-blast-dna-decision") {
    const fallback = createEvaluationPolicy();
    return {
      ...fallback,
      name: "blast-dna-decision-reproduction",
      chooseBreedingAction: () => ({ type: "endPhase" }),
      chooseMainAction(view) {
        const attacker = view.board.find((p) => p.canAttackPlayer && !p.suspended);
        return attacker
          ? { type: "attack", attackerPermanentId: attacker.permanentId, target: { kind: "player" } }
          : { type: "endPhase" };
      },
    };
  }
  if (
    scenario === "arena-discord-1557631388650315826-sukamon-dna-materials" ||
    scenario === "arena-discord-1557631388650315826-sukamon-dna-control"
  ) {
    const fallback = createEvaluationPolicy();
    return {
      ...fallback,
      name: "sukamon-dna-materials-reproduction",
      chooseBreedingAction: () => ({ type: "endPhase" }),
      chooseMainAction(view) {
        const king = view.hand.find((card) => card.cardId === "BT11-043");
        return king === undefined ? { type: "endPhase" } : { type: "playCard", instanceId: king.instanceId };
      },
      answerDecision(view, request) {
        if (request.sourceCardId === "BT11-043") {
          if (request.kind === "chooseTargets") {
            const targetId = "dev-perm-0-sukamon-dna-changed";
            if (request.options?.candidateInstanceIds?.includes(targetId)) {
              return {
                type: "respondDecision",
                decisionId: request.decisionId,
                response: { kind: "chooseTargets", instanceIds: [targetId] },
              };
            }
          }
        }
        return fallback.answerDecision(view, request);
      },
    };
  }
  if (
    scenario === "arena-discord-1557565628439724032-duskmon-dna-colors" ||
    scenario === "arena-discord-1557565628439724032-duskmon-dna-control"
  ) {
    const fallback = createEvaluationPolicy();
    return {
      ...fallback,
      name: "duskmon-dna-colors-reproduction",
      chooseBreedingAction: () => ({ type: "endPhase" }),
      chooseMainAction(view) {
        const duskmon = view.hand.find((card) => card.cardId === "BT18-078");
        return duskmon === undefined ? { type: "endPhase" } : { type: "playCard", instanceId: duskmon.instanceId };
      },
      answerDecision(view, request) {
        if (request.sourceCardId === "BT18-078") {
          if (request.kind === "chooseTargets") {
            const targetId = "dev-perm-0-duskmon-changed";
            if (request.options?.candidateInstanceIds?.includes(targetId)) {
              return {
                type: "respondDecision",
                decisionId: request.decisionId,
                response: { kind: "chooseTargets", instanceIds: [targetId] },
              };
            }
          }
          if (request.kind === "chooseOption") {
            const optionIndex = request.options?.choices?.indexOf("Red") ?? -1;
            if (optionIndex >= 0)
              return {
                type: "respondDecision",
                decisionId: request.decisionId,
                response: { kind: "chooseOption", optionIndex },
              };
          }
        }
        return fallback.answerDecision(view, request);
      },
    };
  }
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
