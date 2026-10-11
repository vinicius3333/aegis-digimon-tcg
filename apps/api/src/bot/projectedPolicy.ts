import { CardKind, type Seat } from "@aegis/shared";
import type { GameEngine } from "../engine/GameEngine.js";
import type { Candidate } from "./candidates.js";
import { bodyValue, scoreCandidate } from "./evaluate.js";
import { createEvaluationPolicy, type BotPolicy, type EvaluationPolicyOptions } from "./policy.js";
import type { BotOptions } from "./BotPlayer.js";
import { DEFAULT_BOT_PROFILE, resolveBotProfile } from "./profiles.js";
import { createBotRandom } from "./rng.js";
import { mainActionReady, mainActions, type TrainingAction } from "./training/actions.js";
import type { BotView } from "./view.js";

/** Default live policy; explicit trained or scenario policies keep their own driver options. */
export function projectedBotOptions(input: { engine: GameEngine; seat: Seat; options?: BotOptions }): BotOptions {
  if (input.options?.policy !== undefined) return input.options;
  return {
    ...input.options,
    policy: createProjectedEvaluationPolicy({
      engine: input.engine,
      seat: input.seat,
      profile: resolveBotProfile(input.options?.profile),
      seed: input.options?.seed,
    }),
    canChooseMainAction: input.options?.canChooseMainAction ?? (() => mainActionReady(input.engine)),
  };
}

export interface ProjectedScoreContext {
  view: BotView;
  candidate: Candidate;
  action: TrainingAction;
  score: number;
}

/** Evaluate authoritative legal declarations and their live costs using public observations. */
export function createProjectedEvaluationPolicy(
  input: {
    engine: GameEngine;
    seat: Seat;
    adjustMainScore?: (context: ProjectedScoreContext) => number;
    onMainChoice?: (candidate: Candidate | undefined) => void;
  } & EvaluationPolicyOptions,
): BotPolicy {
  const profile = input.profile ?? DEFAULT_BOT_PROFILE;
  const base = createEvaluationPolicy(input);
  const random = createBotRandom(input.seed ?? 0x5eed);
  const rejected = new Set<string>();
  const activated = new Set<string>();
  return {
    ...base,
    name: `projected:${profile.name}`,
    onTurnStart() {
      base.onTurnStart();
      rejected.clear();
      activated.clear();
    },
    chooseMainAction(view) {
      let best: Candidate | undefined;
      let bestScore = Number.NEGATIVE_INFINITY;
      for (const action of mainActions(input.engine, input.seat, {
        includeSpecialActions: false,
        digiXrosValidationBudget: 256,
      })) {
        const candidate = projectedCandidate(view, action);
        if (!candidate || candidate.cost > view.maxAffordable || rejected.has(candidate.key)) continue;
        if (candidate.kind === "activateEffect" && activated.has(candidate.key)) continue;
        const materials =
          action.materialIds ??
          (action.intent.type === "playCard" ? action.intent.assembly?.materialInstanceIds : undefined) ??
          [];
        const materialCost = materials.reduce((sum, id) => {
          const body = view.board.find((unit) => unit.permanentId === id || unit.topCardInstanceId === id);
          return sum + (body ? bodyValue(body) * 0.7 : view.hand.some((card) => card.instanceId === id) ? 1 : 0.25);
        }, 0);
        const baselineScore = scoreCandidate(view, candidate, profile) - materialCost;
        const adjustment = input.adjustMainScore?.({ view, candidate, action, score: baselineScore }) ?? 0;
        if (!Number.isFinite(adjustment)) throw new Error("Non-finite projected policy adjustment");
        const score = baselineScore + adjustment + random.next() * 0.01;
        if (score > bestScore) {
          best = candidate;
          bestScore = score;
        }
      }
      if (!best || bestScore <= profile.weights.actionThreshold) {
        input.onMainChoice?.(undefined);
        return { type: "endPhase" };
      }
      input.onMainChoice?.(best);
      if (best.kind === "activateEffect") activated.add(best.key);
      return best.intent;
    },
    noteRejected(intent) {
      rejected.add(JSON.stringify(intent));
      base.noteRejected(intent);
    },
  };
}

function projectedCandidate(view: BotView, action: TrainingAction): Candidate | undefined {
  const intent = action.intent;
  const common = { intent, key: JSON.stringify(intent), cost: action.projectedCost ?? 0 };
  if (intent.type === "endPhase") return { ...common, kind: "endPhase" };
  if (intent.type === "activateEffect") return { ...common, kind: "activateEffect" };
  if (intent.type === "attack") {
    const attacker = view.board.find((unit) => unit.permanentId === intent.attackerPermanentId);
    if (intent.target.kind === "player") return { ...common, kind: "attackPlayer", attacker };
    const targetId = intent.target.permanentId;
    return {
      ...common,
      kind: "attackDigimon",
      attacker,
      target: view.opponentBoard.find((unit) => unit.permanentId === targetId),
    };
  }
  if (intent.type === "digivolve") {
    const base = [...view.board, ...(view.breeding ? [view.breeding] : [])].find(
      (unit) => unit.permanentId === intent.permanentId,
    );
    return {
      ...common,
      kind: "digivolve",
      base,
      definition: view.hand.find((card) => card.instanceId === intent.instanceId)?.definition,
    };
  }
  if (intent.type === "playCard") {
    const definition = view.hand.find((card) => card.instanceId === intent.instanceId)?.definition;
    if (!definition) return undefined;
    const kind = definition.kinds.includes(CardKind.Option)
      ? "playOption"
      : definition.kinds.includes(CardKind.Digimon)
        ? "playDigimon"
        : definition.kinds.includes(CardKind.Tamer)
          ? "playTamer"
          : undefined;
    return kind ? { ...common, kind, definition } : undefined;
  }
  return undefined;
}
