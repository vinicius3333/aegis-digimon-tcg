import {
  appFusionCostFor,
  assemblyRequirementFor,
  digiXrosRequirementFor,
  getCardDefinition,
  type DecisionRequest,
  type Intent,
  type Seat,
} from "@aegis/shared";
import type { GameEngine } from "../../engine/GameEngine.js";
import { digivolveDeps } from "../../engine/gameEngine/actionDeps.js";
import type { Candidate } from "../candidates.js";
import { bodyValue, scoreCandidate } from "../evaluate.js";
import { createEvaluationPolicy, type BotPolicy } from "../policy.js";
import { DEFAULT_BOT_PROFILE } from "../profiles.js";
import { isDigimonCard, type BotView } from "../view.js";
import { mainActions } from "./actions.js";
import { chooseDecisionIntent } from "./decisions.js";
import { firstAssemblyRecipe } from "./assembly.js";
import { selectionCards, trainingObservation } from "./observation.js";

/** Probe only a current explicit material request through the unchanged decision solver. */
function materialTeacherDecision(engine: GameEngine, seat: Seat, request: DecisionRequest): Intent | undefined {
  const options = request.options;
  if (
    request.kind !== "selectCards" ||
    request.seat !== seat ||
    engine.state.pendingDecision?.decisionId !== request.decisionId ||
    options === undefined ||
    Boolean(options.assemblyCardId) === Boolean(options.digiXrosCardId)
  )
    return undefined;
  if (options.assemblyCardId !== undefined && assemblyRequirementFor(options.assemblyCardId)?.[0] === undefined)
    return undefined;
  if (options.digiXrosCardId !== undefined && digiXrosRequirementFor(options.digiXrosCardId)?.[0] === undefined)
    return undefined;
  const cards = selectionCards(trainingObservation(engine.state, seat, request));
  const offered = options.candidateInstanceIds ?? [];
  const min = options.min ?? 0;
  const max = options.max ?? offered.length;
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < min || min > offered.length)
    return undefined;
  if (
    !offered.every((id) => {
      const cardId = cards.get(id)?.cardId;
      return cardId !== undefined && getCardDefinition(cardId) !== undefined;
    })
  )
    return undefined;
  if (
    options.assemblyCardId !== undefined &&
    firstAssemblyRecipe(
      options.assemblyCardId,
      offered.map((instanceId) => ({ instanceId, cardId: cards.get(instanceId)!.cardId! })),
    ) === undefined
  )
    return undefined;
  const unavailable = new Error("Declared materials do not satisfy decision constraints");
  try {
    const intent = chooseDecisionIntent(request, cards, (step) => {
      const material = step.choices.findIndex((choice) => choice.referenceId !== undefined);
      return material >= 0 ? material : step.choices.findIndex((choice) => choice.referenceId === undefined);
    });
    if (
      intent.type !== "respondDecision" ||
      intent.response.kind !== "selectCards" ||
      intent.response.instanceIds.length === 0
    )
      return undefined;
    const ids = intent.response.instanceIds;
    // Assembly's specialized completion program owns the printed recipe. Replay
    // the same IDs through the general constraints too (cost, DP, count, names,
    // colors); DigiXros additionally retains its material-group quotas here.
    const constrained = { ...request, options: { ...options, assemblyCardId: undefined } };
    const proof = chooseDecisionIntent(constrained, cards, (step) => {
      const next = ids[step.selected.length];
      const desired = step.choices.findIndex((choice) =>
        next === undefined ? choice.referenceId === undefined : choice.referenceId === next,
      );
      if (desired >= 0) return desired;
      const finish = step.choices.findIndex((choice) => choice.referenceId === undefined);
      if (finish < 0) throw unavailable;
      return finish;
    });
    if (
      proof.type !== "respondDecision" ||
      proof.response.kind !== "selectCards" ||
      proof.response.instanceIds.length !== ids.length ||
      proof.response.instanceIds.some((id, index) => id !== ids[index])
    )
      return undefined;
    return intent;
  } catch (error) {
    // No engine action is executed by this probe. A constrained request with no
    // legal completion keeps the original teacher's response/refusal behavior.
    if (
      error === unavailable ||
      (error instanceof Error && error.message.startsWith("No legal completion for decision "))
    )
      return undefined;
    throw error;
  }
}

/** Teach compound declarations without changing the fixed heuristic strength opponent. */
export function createTrainingTeacher(engine: GameEngine, seat: Seat, seed: number): BotPolicy {
  const rejectedMaterials = new Set<string>();
  const teacher = createEvaluationPolicy({
    seed,
    additionalMainCandidates: (view) =>
      compoundTeacherCandidates(engine, seat, view).filter(
        (candidate) => !rejectedMaterials.has(JSON.stringify(candidate.intent)),
      ),
  });
  return {
    ...teacher,
    onTurnStart() {
      rejectedMaterials.clear();
      teacher.onTurnStart();
    },
    answerDecision(view, request, signal) {
      return materialTeacherDecision(engine, seat, request) ?? teacher.answerDecision(view, request, signal);
    },
    noteRejected(intent: Intent) {
      // The fixed opponent's ordinary-play key cannot identify a material route.
      // Keep exact rejected declarations here, leaving alternate routes available.
      if (intent.type === "playCard" && (intent.assembly !== undefined || intent.digiXros !== undefined))
        rejectedMaterials.add(JSON.stringify(intent));
      teacher.noteRejected(intent);
    },
  };
}

export function compoundTeacherCandidates(engine: GameEngine, seat: Seat, view: BotView): Candidate[] {
  const candidates: Candidate[] = [];
  for (const action of mainActions(engine, seat)) {
    const intent = action.intent;
    const cost = action.projectedCost ?? 0;
    if (intent.type === "playCard" && (intent.assembly !== undefined || intent.digiXros !== undefined)) {
      const definition = view.hand.find((card) => card.instanceId === intent.instanceId)?.definition;
      if (definition === undefined || !isDigimonCard(definition) || action.projectedCost === undefined) continue;
      candidates.push({
        kind: "playDigimon",
        key: `materialPlay:${JSON.stringify(intent)}`,
        intent,
        cost: action.projectedCost,
        definition,
      });
    } else if (intent.type === "dnaDigivolve") {
      const definition = view.hand.find((card) => card.instanceId === intent.instanceId)?.definition;
      const materials = view.board.filter((unit) => intent.materialPermanentIds.includes(unit.permanentId));
      const base = materials.reduce<(typeof materials)[number] | undefined>(
        (best, unit) => (best === undefined || bodyValue(unit) > bodyValue(best) ? unit : best),
        undefined,
      );
      candidates.push({
        kind: "dnaDigivolve",
        key: `dnaDigivolve:${intent.instanceId}:${intent.materialPermanentIds.join(":")}`,
        intent,
        cost,
        definition,
        base,
        materials,
      });
    } else if (intent.type === "appFusion") {
      candidates.push({
        kind: "appFusion",
        key: `appFusion:${intent.instanceId}:${intent.permanentId}:${intent.linkedInstanceId}`,
        intent,
        cost,
        definition: view.hand.find((card) => card.instanceId === intent.instanceId)?.definition,
        base: view.board.find((unit) => unit.permanentId === intent.permanentId),
      });
    } else if (intent.type === "linkCard") {
      const base = view.board.find((unit) => unit.permanentId === intent.targetPermanentId);
      const source =
        view.hand.find((card) => card.instanceId === intent.instanceId)?.definition ??
        view.board.find((unit) => unit.topCardInstanceId === intent.instanceId)?.definition;
      if (base?.definition === undefined || source === undefined) continue;
      const host = engine.state.players[seat]!.battleArea.find((unit) => unit.permanentId === base.permanentId)!;
      // Avoid guessing which existing link an effect decision will trash at the limit.
      if (host.linked.length > 0) continue;
      const deps = digivolveDeps(engine);
      let best: Candidate | undefined;
      let bestScore = Number.NEGATIVE_INFINITY;
      for (const result of engine.state.players[seat]!.hand) {
        if (result.instanceId === intent.instanceId) continue;
        const definition = getCardDefinition(result.cardId);
        const printed = appFusionCostFor(result.cardId, {
          topName: base.definition.nameEn,
          linkedNames: [source.nameEn],
        });
        if (printed === undefined || definition === undefined) continue;
        if (
          deps.digivolveBaseRestricted?.(engine.state, host, result) === true ||
          deps.digivolveIntoAllowed?.(engine.state, host, result) === false
        )
          continue;
        // This is a planning estimate in the current public state. The next action is
        // regenerated through validateAppFusion after Link and its effects resolve.
        const passive =
          deps.adjustedDigivolveCost?.(engine.state, host, printed, definition, { consumeOnce: false }) ?? printed;
        const reduction = deps.potentialInteractiveDigivolveReduction?.(engine.state, seat, host, definition) ?? 0;
        const candidate: Candidate = {
          kind: "linkCard",
          key: `linkCard:${intent.instanceId}:${intent.targetPermanentId}`,
          intent,
          cost,
          base,
          materials: view.board.filter((unit) => unit.topCardInstanceId === intent.instanceId),
          followUp: { definition, cost: Math.max(0, passive - reduction) },
        };
        const score = scoreCandidate(view, candidate, DEFAULT_BOT_PROFILE);
        if (score > bestScore) {
          best = candidate;
          bestScore = score;
        }
      }
      if (best !== undefined) candidates.push(best);
    }
  }
  return candidates;
}
