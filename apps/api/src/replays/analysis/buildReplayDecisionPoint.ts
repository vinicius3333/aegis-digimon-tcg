import { Phase, type Seat } from "@aegis/shared/schema/enums";
import { digivolutionRequirementsFor } from "@aegis/shared/effects/data";
import type { GameState } from "@aegis/shared/schema/GameState";
import type { Intent } from "@aegis/shared/protocol/intents";
import type { DecisionRequest } from "@aegis/shared/protocol/events";
import { ReplayDecisionAction } from "@aegis/shared/replays/analysis/ReplayDecisionAction";
import { ReplayDecisionContext } from "@aegis/shared/replays/analysis/ReplayDecisionContext";
import type { ReplayDecisionOption, ReplayDecisionPoint } from "@aegis/shared/replays/analysis/ReplayDecisionPoint";
import { breedingActions, mainActionReady, mainActions, type TrainingAction } from "#api/bot/training/actions";
import { trainingObservation } from "#api/bot/training/observation";
import { teacherActionIndex } from "#api/bot/training/teacher";
import type { GameEngine } from "#api/engine/GameEngine";

type Params = {
  engine: GameEngine;
  seat: Seat;
  intent: Intent;
  request?: DecisionRequest;
  frameIndex: number;
  inputIndex: number;
};

type DecisionChoice = Pick<ReplayDecisionPoint, "context" | "options" | "chosen" | "sourceCardId" | "prompt"> & {
  actions?: readonly TrainingAction[];
  optionByAction?: readonly number[];
};

export type ReplayDecisionBuild = {
  decision: ReplayDecisionPoint;
  actions?: readonly TrainingAction[];
  optionByAction?: readonly number[];
};
type CounterEntry = { instanceId: string; effectKey: string; description?: string };
type ActionChoiceParams = { engine: GameEngine; seat: Seat; intent: Intent; context: ReplayDecisionContext };
type EffectChoiceParams = {
  state: GameState;
  request: DecisionRequest;
  intent: Extract<Intent, { type: "respondDecision" }>;
};

const MAIN_INTENTS = new Set<Intent["type"]>([
  "playCard",
  "digivolve",
  "dnaDigivolve",
  "appFusion",
  "linkCard",
  "activateEffect",
  "attack",
  "endPhase",
]);
const BREEDING_INTENTS = new Set<Intent["type"]>(["hatchEgg", "moveFromBreeding", "endPhase"]);

export function buildReplayDecisionPoint({
  engine,
  seat,
  intent,
  request,
  frameIndex,
  inputIndex,
}: Params): ReplayDecisionBuild | undefined {
  const choice = getDecisionChoice({ engine, seat, intent, request });
  if (choice === undefined) {
    return undefined;
  }
  const { actions, optionByAction, ...rest } = choice;
  return {
    decision: { frameIndex, inputIndex, seat, turn: engine.state.turnCount, ...rest },
    ...(actions === undefined ? {} : { actions, optionByAction }),
  };
}

function getDecisionChoice({
  engine,
  seat,
  intent,
  request,
}: Pick<Params, "engine" | "seat" | "intent" | "request">): DecisionChoice | undefined {
  const state = engine.state;
  if (intent.type === "mulligan") {
    return {
      context: ReplayDecisionContext.MULLIGAN.value,
      options: [{ action: ReplayDecisionAction.KEEP_HAND.value }, { action: ReplayDecisionAction.MULLIGAN.value }],
      chosen: [intent.keep ? 0 : 1],
    };
  }
  if (intent.type === "respondDecision") {
    if (request === undefined || request.decisionId !== intent.decisionId) {
      return undefined;
    }
    return getEffectChoice({ state, request, intent });
  }
  if (state.combatWindow !== undefined && state.combatWindow.seat === seat) {
    return getCombatChoice(state, intent);
  }
  if (state.turnSeat !== seat || state.pendingDecision !== undefined || !mainActionReady(engine)) {
    return undefined;
  }
  if (state.phase === Phase.Breeding && BREEDING_INTENTS.has(intent.type)) {
    return getActionChoice({ engine, seat, intent, context: ReplayDecisionContext.BREEDING.value });
  }
  if (state.phase === Phase.Main && MAIN_INTENTS.has(intent.type)) {
    return getActionChoice({ engine, seat, intent, context: ReplayDecisionContext.MAIN.value });
  }
  return undefined;
}

function getActionChoice({ engine, seat, intent, context }: ActionChoiceParams): DecisionChoice {
  const actions =
    context === ReplayDecisionContext.BREEDING.value ? breedingActions(engine, seat) : mainActions(engine, seat);
  const chosen = teacherActionIndex(
    { observation: trainingObservation(engine.state, seat), kind: context, selected: [], actions },
    intent,
  );
  const listed = chosen === undefined ? [...actions, { intent, label: "" }] : actions;
  const { options, positions } = indexOptions(listed.map((action) => getActionOption(engine.state, action)));
  return {
    context,
    options,
    chosen: [positions[chosen ?? actions.length]!],
    actions: listed,
    optionByAction: positions,
  };
}

function getActionOption(state: GameState, action: TrainingAction): ReplayDecisionOption {
  const intent = action.intent;
  const kind = getIntentAction(intent);
  const describesItself = kind === ReplayDecisionAction.ACTIVATE.value || kind === ReplayDecisionAction.SPECIAL.value;
  const cardId = findCardId(state, getIntentSourceId(intent));
  return {
    action: kind,
    cardId,
    targetCardId: findCardId(state, getIntentTargetId(intent)),
    cost: action.projectedCost,
    text: describesItself && action.label !== "" ? action.label : describeDigivolutionRoute({ intent, cardId }),
  };
}

function describeDigivolutionRoute({ intent, cardId }: { intent: Intent; cardId: string | undefined }) {
  if (intent.type !== "digivolve" || intent.alternateRequirementIndex === undefined || cardId === undefined) {
    return undefined;
  }
  const requirement = digivolutionRequirementsFor(cardId)?.[intent.alternateRequirementIndex];
  if (requirement === undefined) {
    return "Alternate requirement";
  }
  const parts: string[] = [];
  if (requirement.level !== undefined) {
    parts.push(`from Lv.${requirement.level}`);
  } else if (requirement.levelMin !== undefined || requirement.levelMax !== undefined) {
    parts.push(`from Lv.${requirement.levelMin ?? 1}–${requirement.levelMax ?? requirement.levelMin}`);
  }
  const names = requirement.namesExact ?? requirement.names;
  if (names !== undefined && names.length > 0) {
    parts.push(names.map((name) => `[${name}]`).join("/"));
  }
  if (requirement.traits !== undefined && requirement.traits.length > 0) {
    parts.push(`with ${requirement.traits.map((trait) => `[${trait}]`).join("/")} trait`);
  }
  if (requirement.colors !== undefined && requirement.colors.length > 0) {
    parts.push(requirement.colors.join("/"));
  }
  if (requirement.sourceZones !== undefined) {
    parts.push(`played from ${requirement.sourceZones.join(" or ")}`);
  }
  return parts.length === 0 ? "Alternate requirement" : `Alternate requirement: ${parts.join(", ")}`;
}

function getIntentAction(intent: Intent): ReplayDecisionAction {
  switch (intent.type) {
    case "endPhase":
      return ReplayDecisionAction.END_PHASE.value;
    case "hatchEgg":
      return ReplayDecisionAction.HATCH.value;
    case "moveFromBreeding":
      return ReplayDecisionAction.MOVE_FROM_BREEDING.value;
    case "playCard":
      return ReplayDecisionAction.PLAY.value;
    case "digivolve":
      return ReplayDecisionAction.DIGIVOLVE.value;
    case "attack":
      if (intent.target.kind === "player") {
        return ReplayDecisionAction.ATTACK_PLAYER.value;
      }
      return ReplayDecisionAction.ATTACK_DIGIMON.value;
    case "activateEffect":
      return ReplayDecisionAction.ACTIVATE.value;
    default:
      return ReplayDecisionAction.SPECIAL.value;
  }
}

function getIntentSourceId(intent: Intent): string | undefined {
  switch (intent.type) {
    case "playCard":
    case "digivolve":
    case "dnaDigivolve":
    case "appFusion":
    case "linkCard":
      return intent.instanceId;
    case "attack":
      return intent.attackerPermanentId;
    case "activateEffect":
      return intent.sourceInstanceId;
    case "moveFromBreeding":
      return intent.permanentId;
    default:
      return undefined;
  }
}

function getIntentTargetId(intent: Intent): string | undefined {
  switch (intent.type) {
    case "digivolve":
    case "appFusion":
      return intent.permanentId;
    case "linkCard":
      return intent.targetPermanentId;
    case "attack":
      return intent.target.kind === "permanent" ? intent.target.permanentId : undefined;
    default:
      return undefined;
  }
}

function getCombatChoice(state: GameState, intent: Intent): DecisionChoice | undefined {
  const window = state.combatWindow!;
  const decline = { action: ReplayDecisionAction.DECLINE.value };
  const permanentOption = (action: ReplayDecisionAction, permanentId: string): ReplayDecisionOption => ({
    action,
    cardId: findCardId(state, permanentId),
  });
  if (intent.type === "declareBlock" || intent.type === "declineBlock") {
    const blockers = [...window.eligiblePermanentIds];
    const options = blockers.map((id) => permanentOption(ReplayDecisionAction.BLOCK.value, id));
    const chosen = intent.type === "declareBlock" ? blockers.indexOf(intent.blockerPermanentId) : blockers.length;
    return combatChoice(state, window.attackerPermanentId, window.mustBlock ? options : [...options, decline], [
      chosen,
    ]);
  }
  if (intent.type === "respondAlliance") {
    const allies = [...window.eligiblePermanentIds];
    const options = allies.map((id) => permanentOption(ReplayDecisionAction.ALLY.value, id));
    const chosen = intent.allyPermanentId === undefined ? allies.length : allies.indexOf(intent.allyPermanentId);
    return combatChoice(state, window.permanentId, [...options, decline], [chosen]);
  }
  if (intent.type === "respondCounter") {
    const counters = parseCounters(window.eligibleCountersJson);
    const options = counters.map((counter) => ({
      action: ReplayDecisionAction.COUNTER.value,
      cardId: findCardId(state, counter.instanceId),
      text: counter.description,
    }));
    const chosen = counters.findIndex(
      (counter) => counter.instanceId === intent.sourceInstanceId && counter.effectKey === intent.effectKey,
    );
    return combatChoice(
      state,
      window.attackerPermanentId,
      [...options, decline],
      [chosen < 0 ? counters.length : chosen],
    );
  }
  if (intent.type === "respondEvade" || intent.type === "respondBarrier") {
    const options = [permanentOption(ReplayDecisionAction.ACCEPT.value, intent.permanentId), decline];
    return combatChoice(state, intent.permanentId, options, [intent.accept ? 0 : 1]);
  }
  return undefined;
}

function combatChoice(
  state: GameState,
  sourceId: string,
  options: ReplayDecisionOption[],
  chosen: number[],
): DecisionChoice {
  return {
    context: ReplayDecisionContext.COMBAT.value,
    sourceCardId: findCardId(state, sourceId),
    ...collapseOptions(options, chosen),
  };
}

function parseCounters(json: string): CounterEntry[] {
  if (json === "") {
    return [];
  }
  const parsed: unknown = JSON.parse(json);
  return Array.isArray(parsed) ? (parsed as CounterEntry[]) : [];
}

function getEffectChoice({ state, request, intent }: EffectChoiceParams): DecisionChoice {
  const visible = new Map((request.options?.visibleCards ?? []).map((card) => [card.instanceId, card.cardId]));
  const cardOption = (id: string): ReplayDecisionOption => ({
    action: ReplayDecisionAction.SELECT_CARD.value,
    cardId: visible.get(id) ?? findCardId(state, id),
  });
  const response = intent.response;
  const common = {
    context: ReplayDecisionContext.EFFECT.value,
    sourceCardId: request.sourceCardId,
    prompt: request.promptText || undefined,
  };
  switch (response.kind) {
    case "optional":
      return {
        ...common,
        options: [{ action: ReplayDecisionAction.ACCEPT.value }, { action: ReplayDecisionAction.DECLINE.value }],
        chosen: [response.accept ? 0 : 1],
      };
    case "chooseOption":
      return {
        ...common,
        options: (request.options?.choices ?? []).map((text) => ({ action: ReplayDecisionAction.CHOOSE.value, text })),
        chosen: [response.optionIndex],
      };
    case "chooseTargets":
    case "selectCards": {
      const candidates = request.options?.candidateInstanceIds ?? [];
      return {
        ...common,
        ...collapseOptions(
          candidates.map(cardOption),
          response.instanceIds.map((id) => candidates.indexOf(id)),
        ),
      };
    }
    case "orderCards": {
      const candidates = request.options?.candidateInstanceIds ?? response.order;
      return {
        ...common,
        ...collapseOptions(candidates.map(cardOption), [candidates.indexOf(response.order[0] ?? "")]),
      };
    }
    case "orderTriggers": {
      const keys = request.options?.triggerKeys ?? [];
      const cardIds = request.options?.triggerCardIds ?? [];
      const first = response.orderIndexes?.[0] ?? keys.indexOf(response.order[0] ?? "");
      return {
        ...common,
        ...collapseOptions(
          keys.map((_, index) => ({ action: ReplayDecisionAction.SELECT_CARD.value, cardId: cardIds[index] })),
          [first],
        ),
      };
    }
  }
}

function indexOptions(options: readonly ReplayDecisionOption[]): {
  options: ReplayDecisionOption[];
  positions: number[];
} {
  const collapsed: ReplayDecisionOption[] = [];
  const keys = new Map<string, number>();
  const positions = options.map((option) => {
    const key = JSON.stringify(option);
    let position = keys.get(key);
    if (position === undefined) {
      position = collapsed.push(option) - 1;
      keys.set(key, position);
    }
    return position;
  });
  return { options: collapsed, positions };
}

function collapseOptions(
  options: readonly ReplayDecisionOption[],
  chosen: readonly number[],
): Pick<ReplayDecisionPoint, "options" | "chosen"> {
  const indexed = indexOptions(options);
  const picked = chosen.flatMap((index) =>
    index >= 0 && index < indexed.positions.length ? [indexed.positions[index]!] : [],
  );
  return { options: indexed.options, chosen: [...new Set(picked)] };
}

function findCardId(state: GameState, id: string | undefined): string | undefined {
  if (id === undefined) {
    return undefined;
  }
  for (const player of state.players) {
    const permanents = player.breeding === undefined ? [...player.battleArea] : [...player.battleArea, player.breeding];
    for (const permanent of permanents) {
      if (permanent.permanentId === id) {
        return permanent.topCard.cardId;
      }
      const card = [permanent.topCard, ...permanent.stack, ...permanent.linked].find(
        (instance) => instance.instanceId === id,
      );
      if (card !== undefined) {
        return card.cardId;
      }
    }
    const loose = [
      ...player.hand,
      ...player.trash,
      ...player.security,
      ...player.deck,
      ...player.delayZone,
      ...player.eggDeck,
    ].find((instance) => instance.instanceId === id);
    if (loose !== undefined) {
      return loose.cardId;
    }
  }
  return undefined;
}
