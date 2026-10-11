import type { Seat } from "@aegis/shared";
import type { GameEngine } from "../../engine/GameEngine.js";
import type { Candidate } from "../candidates.js";
import { createProjectedEvaluationPolicy } from "../projectedPolicy.js";
import type { BotView } from "../view.js";
import { trainingObservation } from "../training/observation.js";
import type { TrainingAction } from "../training/actions.js";
import { actionCardId, actionFeatures, scoreHeuristicRules, type HeuristicProgram } from "./heuristic.js";

/** Start with exactly the certified balanced policy; evolve bounded score adjustments. */
export const SEED_RESIDUAL: HeuristicProgram = {
  schemaVersion: 1,
  basePolicy: "projected-balanced",
  title: "Balanced decisions with learned situational preferences",
  rules: [
    "cost",
    "handover",
    "attackPlayer",
    "attackWinningBattle",
    "attackLosingBattle",
    "digivolve",
    "breedingGrowth",
    "levelGain",
    "dpGain",
    "playBody",
    "playTamer",
    "playOption",
    "pass",
    "activate",
    "materials",
    "sourceDp",
    "securityChecks",
    "readyAttackers",
  ].map((feature) => ({
    feature: feature as HeuristicProgram["rules"][number]["feature"],
    weight: 0,
    advice: "Use the balanced evaluation until a situational preference is demonstrated.",
  })),
};

export function createResidualPolicy(input: {
  engine: GameEngine;
  seat: Seat;
  seed: number;
  program: HeuristicProgram;
  onDecision?: (trace: unknown) => void;
}) {
  if (input.program.basePolicy !== "projected-balanced") throw new Error("Residual policy needs the balanced base");
  let lastView: BotView | undefined;
  let observation: ReturnType<typeof trainingObservation>;
  let entries: {
    key: string;
    score: number;
    action: TrainingAction;
    features: ReturnType<typeof actionFeatures>;
    sourceCardId?: string;
    contributions: ReturnType<typeof scoreHeuristicRules>["contributions"];
  }[] = [];
  return createProjectedEvaluationPolicy({
    engine: input.engine,
    seat: input.seat,
    seed: input.seed,
    adjustMainScore({ view, candidate, action, score }) {
      if (lastView !== view) {
        lastView = view;
        observation = trainingObservation(input.engine.state, input.seat);
        entries = [];
      }
      const window = { observation, kind: "main", selected: [], actions: [action] };
      const features = actionFeatures(window, 0);
      features.baselineScore = score;
      features.securityChecks =
        candidate.kind === "attackPlayer" ? Math.max(0, candidate.attacker?.securityAttack ?? 1) : 0;
      features.readyAttackers = view.readyAttackers.length;
      const sourceCardId = actionCardId(window, 0);
      const adjustment = scoreHeuristicRules(input.program, features, "main", sourceCardId, observation);
      if (input.onDecision)
        entries.push({
          key: candidate.key,
          score: score + adjustment.score,
          action,
          features,
          sourceCardId,
          contributions: adjustment.contributions,
        });
      return adjustment.score;
    },
    onMainChoice(candidate: Candidate | undefined) {
      if (!input.onDecision) return;
      const ranked = [...entries].sort((a, b) => b.score - a.score);
      const chosen = candidate ? entries.find((entry) => entry.key === candidate.key) : undefined;
      input.onDecision({
        kind: "main",
        turn: observation.turn,
        action: chosen?.action ?? { intent: { type: "endPhase" }, label: "Pass below action threshold" },
        sourceCardId: chosen?.sourceCardId,
        features: chosen?.features,
        score: chosen?.score,
        legalActions: entries.length,
        topScoreTies: ranked.filter((entry) => entry.score === ranked[0]?.score).length,
        scoreTies: chosen ? ranked.filter((entry) => entry.score === chosen.score).length : 0,
        reasons: chosen?.contributions.filter((rule) => rule.value !== 0) ?? [],
        alternatives: ranked
          .filter((entry) => entry !== chosen)
          .slice(0, 3)
          .map(({ action, features, score, sourceCardId }) => ({ action, features, score, sourceCardId })),
      });
    },
  });
}
