/* What the viewer does in each measured scenario, and how it answers what it is asked.

   The moves follow the effects lab's own instructions for each scenario (apps/web/src/dev/
   EffectsLab.tsx and LiveArenaDemo.tsx). The answers port the engine test harness's auto
   responders (apps/api/src/engine/testkit/harness.ts): take the offered order, accept an
   optional effect unless its prompt is refused, pick the most cards allowed with a preference
   list first. The same plan drives every pacing mode, so modes are compared on one game. */

import { Phase, type DecisionRequest, type DecisionResponse, type GameState, type Intent } from "@aegis/shared";
import type { DevScenarioId } from "@aegis-api/engine/devScenario.js";

const VIEWER = 0;

export const SKIP = "skip";

export interface AnswerPreferences {
  /** Instance ids a card selection takes first. */
  preferInstanceIds?: readonly string[];
  /** Prompts (by substring of their text) the viewer refuses. */
  declinePrompts?: readonly string[];
  declineAllOptional?: boolean;
  blockFirstAvailable?: boolean;
}

export interface ScenarioPlan {
  id: DevScenarioId;
  /** Distinct accept/decline runs may share the same authoritative server layout. */
  variant?: string;
  /**
   * The viewer's moves, in order. Each is played once the board is idle and nothing is asked.
   * A move returns undefined while its moment has not come, and `SKIP` once it has passed.
   */
  moves: readonly ((state: GameState) => Intent | typeof SKIP | undefined)[];
  answers: AnswerPreferences;
  /** The run ends once every move is played, this holds, and the screen has gone idle. */
  finished(state: GameState, resolvedBySeat: readonly [number, number]): boolean;
  /** Virtual time ceiling for the whole run. */
  maxMs: number;
}

const endPhase = (): Intent => ({ type: "endPhase" });

function permanentOf(state: GameState, cardId: string) {
  return state.players[VIEWER]?.battleArea.find((permanent) => permanent.topCard?.cardId === cardId);
}

function handCard(state: GameState, cardId: string) {
  return state.players[VIEWER]?.hand.find((card) => card.cardId === cardId);
}

function digivolve(fromCardId: string, toCardId: string) {
  return (state: GameState): Intent | undefined => {
    const permanent = permanentOf(state, fromCardId);
    const card = handCard(state, toCardId);
    if (!permanent || !card) return undefined;
    return { type: "digivolve", permanentId: permanent.permanentId, instanceId: card.instanceId };
  };
}

function attackPlayerWith(pick: (state: GameState) => string | undefined) {
  return (state: GameState): Intent | undefined => {
    const attackerPermanentId = pick(state);
    return attackerPermanentId ? { type: "attack", attackerPermanentId, target: { kind: "player" } } : undefined;
  };
}

function firstReadyAttacker(state: GameState): string | undefined {
  return state.players[VIEWER]?.battleArea.find((permanent) => !permanent.isSuspended)?.permanentId;
}

/** Waits for the viewer's own breeding step, then passes it; the engine may have passed it already. */
function passBreeding(state: GameState): Intent | typeof SKIP | undefined {
  if (state.turnSeat !== VIEWER) return undefined;
  if (state.phase === Phase.Breeding) return endPhase();
  return state.phase === Phase.Main ? SKIP : undefined;
}

function passMain(state: GameState): Intent | undefined {
  return state.turnSeat === VIEWER && state.phase === Phase.Main ? endPhase() : undefined;
}

const MAX_MS = 150_000;

export const SCENARIO_PLANS: readonly ScenarioPlan[] = [
  {
    id: "effects-lab-own-chain",
    moves: [passBreeding, digivolve("BT10-062", "BT9-065")],
    answers: {},
    finished: (state, resolved) => resolved[0] >= 6 && permanentOf(state, "BT9-065") !== undefined,
    maxMs: MAX_MS,
  },
  {
    id: "effects-lab-opponent-chain",
    moves: [passBreeding, passMain],
    answers: {},
    finished: (_state, resolved) => resolved[1] >= 5,
    maxMs: MAX_MS,
  },
  {
    id: "effects-lab-opponent-play",
    moves: [passBreeding, passMain],
    answers: {},
    finished: (state, resolved) =>
      state.players[1]?.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-029") === true &&
      resolved[1] >= 1,
    maxMs: MAX_MS,
  },
  {
    id: "effects-lab-nested",
    moves: [passBreeding, attackPlayerWith(firstReadyAttacker)],
    answers: {},
    finished: (_state, resolved) => resolved[0] + resolved[1] >= 6,
    maxMs: MAX_MS,
  },
  {
    id: "effects-lab-prod-royal-knights",
    moves: [
      passBreeding,
      digivolve("BT2-027", "ST8-10"),
      attackPlayerWith((state) => permanentOf(state, "ST8-10")?.permanentId),
    ],
    answers: {},
    finished: (_state, resolved) => resolved[1] >= 1,
    maxMs: MAX_MS,
  },
  {
    id: "effects-lab-prod-ghost",
    moves: [passBreeding, passMain],
    answers: { preferInstanceIds: ["dev-lab-ghost-discard"], declinePrompts: ["Digivolve"] },
    finished: (_state, resolved) => resolved[0] + resolved[1] >= 8,
    maxMs: MAX_MS,
  },
  {
    id: "effects-lab-prod-ghost-execute",
    moves: [passBreeding, passMain],
    answers: {},
    finished: (_state, resolved) => resolved[0] >= 12,
    maxMs: MAX_MS,
  },
  {
    id: "effects-lab-prod-ghost-execute-security",
    moves: [passBreeding, passMain],
    answers: {},
    finished: (_state, resolved) => resolved[0] >= 12 && resolved[1] >= 1,
    maxMs: MAX_MS,
  },
  {
    id: "effects-lab-prod-attack-stack",
    moves: [passBreeding, digivolve("AD1-025", "EX13-077")],
    answers: {
      preferInstanceIds: ["first", "second", "third"].map((slot) => `dev-perm-1-lab-attack-target-${slot}`),
    },
    finished: (_state, resolved) => resolved[0] >= 5 && resolved[1] >= 1,
    maxMs: MAX_MS,
  },
  {
    id: "effects-lab-prod-security-removed",
    moves: [passBreeding, attackPlayerWith((state) => permanentOf(state, "BT26-103")?.permanentId)],
    answers: {},
    finished: (_state, resolved) => resolved[0] >= 5,
    maxMs: MAX_MS,
  },
  {
    id: "effects-lab-prod-titan-cascade",
    moves: [passBreeding, attackPlayerWith((state) => permanentOf(state, "BT26-059")?.permanentId)],
    answers: { preferInstanceIds: ["dev-lab-titan-discard", "dev-lab-titan-witchmon"] },
    finished: (_state, resolved) => resolved[0] >= 5,
    maxMs: MAX_MS,
  },
  {
    id: "arena-ex13-deletion-trigger-ordering",
    moves: [
      passBreeding,
      (state) => {
        const heatViper = handCard(state, "BT2-109");
        return heatViper ? { type: "playCard", instanceId: heatViper.instanceId } : undefined;
      },
    ],
    answers: { preferInstanceIds: [] },
    finished: (_state, resolved) => resolved[0] >= 3,
    maxMs: MAX_MS,
  },
  {
    id: "arena-gate-deadly-sins-effect-order",
    moves: [passBreeding],
    answers: { preferInstanceIds: ["dev-gate-order-lucemon"] },
    finished: (state, resolved) => state.turnSeat === VIEWER && resolved[0] >= 4,
    maxMs: MAX_MS,
  },
  {
    id: "arena-security-effect-pacing",
    moves: [passBreeding, attackPlayerWith(firstReadyAttacker), attackPlayerWith(firstReadyAttacker)],
    answers: {},
    finished: (state) => (state.players[1]?.securityCount ?? 5) <= 3,
    maxMs: MAX_MS,
  },
  {
    id: "arena-ex13-giromon-block-triggers",
    moves: [],
    answers: { blockFirstAvailable: true },
    finished: (_state, resolved) => resolved[0] >= 6,
    maxMs: MAX_MS,
  },
  ...[false, true].map((decline): ScenarioPlan => ({
    id: "arena-drasil-optional-effect-presets",
    variant: `arena-drasil-optional-effect-presets-${decline ? "declined" : "accepted"}`,
    moves: [
      passBreeding,
      (state) => {
        const card = handCard(state, "BT23-062");
        return card ? { type: "playCard", instanceId: card.instanceId } : undefined;
      },
    ],
    answers: { declineAllOptional: decline },
    finished: (state, resolved) => {
      const drasil =
        state.players[VIEWER]?.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT23-072") ?? [];
      return (
        permanentOf(state, "BT23-062") !== undefined &&
        drasil.length === 2 &&
        drasil.every((permanent) => permanent.isSuspended === !decline) &&
        (decline || resolved[0] >= 2)
      );
    },
    maxMs: MAX_MS,
  })),
];

/** The target a selection prefers: the viewer's EX13-028 Sukamon, whose deletion is the point. */
function preferredIds(state: GameState, preferences: AnswerPreferences): Set<string> {
  const preferred = new Set(preferences.preferInstanceIds ?? []);
  const sukamon = permanentOf(state, "EX13-028");
  if (sukamon) {
    preferred.add(sukamon.permanentId);
    if (sukamon.topCard) preferred.add(sukamon.topCard.instanceId);
  }
  return preferred;
}

/** The viewer's answer, as the engine harness's auto responders would give it. */
export function answerDecision(
  request: DecisionRequest,
  state: GameState,
  preferences: AnswerPreferences,
): DecisionResponse | undefined {
  const options = request.options;
  const refused =
    (preferences.declineAllOptional === true && request.kind === "optional") ||
    (preferences.declinePrompts ?? []).some((prompt) => (request.promptText ?? "").includes(prompt)) ||
    (request.kind === "selectCards" && options?.digiXrosCardId !== undefined);
  switch (request.kind) {
    case "orderTriggers": {
      const keys = [...(options?.triggerKeys ?? [])];
      return { kind: "orderTriggers", order: options?.acceptsResolutionPlan ? keys : keys.slice(0, 1) };
    }
    case "optional":
      return { kind: "optional", accept: !refused };
    case "chooseOption": {
      const declineIndex = options?.declineIndex;
      return { kind: "chooseOption", optionIndex: refused && declineIndex !== undefined ? declineIndex : 0 };
    }
    case "orderCards":
      return { kind: "orderCards", order: [...(options?.candidateInstanceIds ?? [])] };
    case "selectCards":
    case "chooseTargets": {
      if (refused && (options?.min ?? 0) === 0) return { kind: request.kind, instanceIds: [] };
      const preferred = preferredIds(state, preferences);
      const candidates = [...(options?.candidateInstanceIds ?? [])].sort(
        (a, b) => Number(!preferred.has(a)) - Number(!preferred.has(b)),
      );
      const max = typeof options?.max === "number" && Number.isFinite(options.max) ? options.max : candidates.length;
      return { kind: request.kind, instanceIds: candidates.slice(0, max) };
    }
    default:
      return undefined;
  }
}

/** The pass (or forced block) for a combat window the viewer is asked to answer. */
export function answerCombatWindow(state: GameState, preferences: AnswerPreferences = {}): Intent | undefined {
  const window = state.combatWindow;
  if (!window || window.seat !== VIEWER) return undefined;
  switch (window.kind) {
    case "block":
      return (window.mustBlock || preferences.blockFirstAvailable) && window.eligiblePermanentIds[0]
        ? { type: "declareBlock", blockerPermanentId: window.eligiblePermanentIds[0] }
        : { type: "declineBlock" };
    case "counter":
      return { type: "respondCounter" };
    case "alliance":
      return { type: "respondAlliance" };
    case "evade":
      return { type: "respondEvade", permanentId: window.permanentId, accept: false };
    case "barrier":
      return { type: "respondBarrier", permanentId: window.permanentId, accept: false };
    default:
      return undefined;
  }
}
