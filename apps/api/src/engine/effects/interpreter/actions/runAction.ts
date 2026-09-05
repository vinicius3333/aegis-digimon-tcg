// The per-kind dispatch for every IR action.

import type { EffectContext } from "../../EffectContext.js";
import { evaluateCondition } from "../conditions.js";
import { canPayCost, payCost, payOneCostOption } from "../costs.js";
import { describeAction, describeCost } from "../describe.js";
import { type ActionScope, installActionRunner } from "../dispatch.js";
import { unsupported } from "../errors.js";
import { permanentMatchesFilter } from "../matching/permanent.js";
import { scaleFactor } from "../scaling.js";
import { targetFateOf } from "../targetFate.js";
import { DEFAULT_PLAY_ZONES, candidateLooseInstances, zoneList } from "../targeting/loose.js";
import { candidatePermanents, resolvePermanentTargets } from "../targeting/permanents.js";
import { targetAfterSelfPlacementCost } from "../targeting/afterCost.js";
import { runBoardAction } from "./board.js";
import { runCombatAction } from "./combat.js";
import { runControlFlowAction } from "./controlFlow.js";
import { runDigivolutionAction } from "./digivolution.js";
import { canAttemptDigivolve } from "./digivolve.js";
import { runGrantStaticAction } from "./grantStatic.js";
import { runMetaAction } from "./meta.js";
import { canAttemptPlaceUnder } from "./placeUnder.js";
import {
  applyDecodeHostScope,
  applyPlayCostCeiling,
  materializeLevelComparisonScaling,
  runPlayAction,
} from "./play.js";
import { canAttemptUseOptionWithoutCost } from "./borrowed.js";
import { runRemovalAction } from "./removal.js";
import { runResourceAction } from "./resources.js";
import { runRestrictionAction } from "./restrictions.js";
import { runRevealAction } from "./reveal.js";
import { runSecurityAction } from "./security.js";
import { runStaticAction } from "./statics.js";
import type { Action, Cost, Target, ZoneRef } from "@aegis/shared";

function isCostBearingAction(action: Action): boolean {
  // RawUnparsedAction is the sole Action variant that is not based on ActionBase.
  // Narrow before reading the common cost fields so this guard remains sound as the
  // closed union gains more action kinds.
  if (action.kind === "RawUnparsed") return false;
  return (
    action.cost !== undefined ||
    action.additionalCost !== undefined ||
    (action.additionalCosts?.length ?? 0) > 0 ||
    (action.costOptions?.length ?? 0) > 0
  );
}

/**
 * Q5331's borrowed BT23-045 On Play has a context-specific source priority: an eligible Royal
 * Base/Zaxon card in trash must be placed before a hand fallback. Keep this transformation on
 * the borrowed resolution context so the ordinary BT23-045 effect and every other borrower keep
 * their declared source pool and selection behavior.
 */
function borrowedProcessingCost(ctx: EffectContext, cost: Cost): Cost {
  if (
    ctx.borrowedEffectOverrides?.preferTrashCostSource !== true ||
    cost.kind !== "place" ||
    cost.target === undefined
  ) {
    return cost;
  }
  const sourceZones = (Array.isArray(cost.target.from) ? cost.target.from : [cost.target.from]).filter(
    (zone): zone is ZoneRef => typeof zone === "string",
  );
  if (sourceZones.length !== 2 || !sourceZones.includes("hand") || !sourceZones.includes("trash")) {
    return cost;
  }
  const trashCandidates = candidateLooseInstances(ctx, cost.target, ["trash"]);
  const handCandidates = candidateLooseInstances(ctx, cost.target, ["hand"]);
  const preferredZones: ZoneRef[] =
    trashCandidates.length > 0 ? ["trash"] : handCandidates.length > 0 ? ["hand"] : sourceZones;
  if (
    preferredZones.length === sourceZones.length &&
    preferredZones.every((zone, index) => zone === sourceZones[index])
  ) {
    return cost;
  }
  return {
    ...cost,
    target: {
      ...cost.target,
      from: preferredZones,
    },
  };
}

/**
 * A loose-card payment can define the following Delete target (same name/relative level).
 * Prove that at least one payable card/target pair exists before offering or consuming the cost;
 * the real binding is written by payCost after the player chooses the payment.
 */
function looseCostCanProduceDeleteTarget(
  ctx: EffectContext,
  action: Extract<Action, { kind: "Delete" }>,
  cost: Cost,
): boolean {
  const ref = cost.bindResultAs;
  const costTarget = cost.target;
  if (ref === undefined || costTarget === undefined) return false;
  const sameName = action.target.filter.sameNameAsSelection === ref;
  const relative = action.target.filter.relativeTo;
  if (!sameName && relative?.selectionRef !== ref) return false;
  const zone = costTarget.filter.zone;
  const zones = (Array.isArray(zone) ? zone : zone === undefined ? [] : [zone]).filter(
    (candidate): candidate is ZoneRef => candidate === "hand" || candidate === "trash",
  );
  if (zones.length === 0) return false;
  const costCandidates = candidateLooseInstances(ctx, costTarget, zones);
  if (costCandidates.length === 0) return false;
  const { sameNameAsSelection: _sameName, relativeTo: _relative, ...staticFilter } = action.target.filter;
  const targets = candidatePermanents(ctx, { ...action.target, filter: staticFilter } as Target);
  return costCandidates.some((candidate) => {
    const paid = ctx.game.definitionOf({ cardId: candidate.cardId });
    return targets.some((target) => {
      if (target.topCard === undefined) return false;
      const targetDefinition = ctx.game.definitionOf(target.topCard);
      if (sameName) {
        const paidName = (paid.nameEn ?? "").toLowerCase();
        return paidName !== "" && paidName === (targetDefinition.nameEn ?? "").toLowerCase();
      }
      if (relative === undefined) return false;
      const lhs =
        relative.attr === "dp"
          ? target.currentDP
          : relative.attr === "digivolutionCount"
            ? target.stack.length
            : relative.attr === "level"
              ? targetDefinition.level
              : targetDefinition.playCost;
      const rhs =
        relative.attr === "dp"
          ? paid.dp
          : relative.attr === "digivolutionCount"
            ? 0
            : relative.attr === "level"
              ? paid.level
              : paid.playCost;
      if (lhs === undefined || rhs === undefined) return false;
      if (relative.op === "lte") return lhs <= rhs;
      if (relative.op === "gte") return lhs >= rhs;
      return lhs === rhs;
    });
  });
}

// ---------------------------------------------------------------------------
// Action dispatch
// ---------------------------------------------------------------------------

/**
 * Run a single Action against the live context.
 * Returns `true` when the action was an optional that was declined AND
 * `abortOnDecline` is set — the caller should stop processing further actions.
 */
export async function runAction(ctx: EffectContext, action: Action): Promise<boolean> {
  // Display-only provenance: every decision this action raises carries what the
  // action is about to do to the permanents it offers, so the client badges a
  // picked target instead of reading its fate out of printed English. Restored
  // afterwards because a nested action (a branch, a repeat) resolves its own
  // targets and must not inherit the outer action's fate.
  const outerFate = ctx.activeTargetFate;
  const outerDelayArmedConsumed = ctx.delayArmedConsumed;
  ctx.activeTargetFate = targetFateOf(action);
  try {
    return await runActionInner(ctx, action);
  } finally {
    ctx.activeTargetFate = outerFate;
    // `requiresDelayArmed` is scoped to this action resolution. Some focused
    // contexts are intentionally reused across timing windows; leaking the
    // consumed flag would let the same payload run again without a new grant.
    ctx.delayArmedConsumed = outerDelayArmedConsumed;
  }
}

async function runActionInner(ctx: EffectContext, action: Action): Promise<boolean> {
  // A placement tally is scoped to this action's current resolution.  In particular, a
  // declined/blocked optional placement must overwrite a prior activation's count rather
  // than allowing a later conditional to borrow it (EX6-073 Q3825).
  if (action.kind === "PlaceUnder") {
    if (action.trackCount !== undefined || action.trackDistinctNames !== undefined) {
      ctx.namedCounts ??= new Map();
      if (action.trackCount !== undefined) ctx.namedCounts.set(action.trackCount, 0);
      if (action.trackDistinctNames !== undefined) ctx.namedCounts.set(action.trackDistinctNames, 0);
    }
  }
  if (action.kind === "PlayWithoutCost" && action.target.filter?.sameColorAsReturned === true) {
    ctx.lastReturnedColors = undefined;
  }
  // Per-action gate. `while` is the continuously re-evaluated spelling used by persistent
  // actions: the recompute pass clears the old contribution, and this gate decides whether
  // the action contributes again. Individual handlers may additionally use `while` to mark
  // dynamic grants, but every action kind needs the same truth test (not only Aura/Restrict).
  const gate =
    action.kind === "RawUnparsed" || action.kind === "ConditionalBranch"
      ? undefined
      : (action.condition ?? ("while" in action ? action.while : undefined));
  if (gate !== undefined) {
    ctx.lastActionConditionMatched = evaluateCondition(ctx, gate);
    if (!ctx.lastActionConditionMatched) return false;
  } else {
    ctx.lastActionConditionMatched = true;
  }
  // A Delay payload may use any action kind, including GainKeyword. Consume an armed Delay
  // grant here for action kinds whose specialized handlers do not own that gate. The intrinsic
  // Main Delay wrapper passes delayArmedConsumed after consuming its grant, while Play,
  // Replacement, and SubTrigger handlers can safely observe the same flag without double use.
  const ownsDelayGate =
    action.kind === "PlayWithoutCost" || action.kind === "Replacement" || action.kind === "SubTrigger";
  if (
    action.kind !== "RawUnparsed" &&
    !ownsDelayGate &&
    action.requiresDelayArmed === true &&
    ctx.delayArmedConsumed !== true
  ) {
    const self = ctx.source.permanent();
    if (self === undefined) return false;
    const hasDelay = (ctx.fx.grantedKeywords?.(self.permanentId) ?? []).some((grant) => grant.keyword === "Delay");
    if (!hasDelay) return false;
    ctx.fx.revokeKeyword?.(self.permanentId, "Delay");
    ctx.delayArmedConsumed = true;
  }
  // "By paying ..., return 1 [X]" is not worth offering when nothing can be returned — but
  // only a BATTLE-AREA return is answered by a board scan. A return that sources a loose card
  // ("from your trash to the hand", BT16-031) has its candidates in another zone, where
  // resolvePermanentTargets always finds none and would abort every such clause outright.
  const returnsLooseCard =
    action.kind === "Return" &&
    ((action.from?.length ?? 0) > 0 ||
      (action.target.filter.zone !== undefined && action.target.filter.zone !== "battleArea"));
  const returnBoundProducedByCost =
    action.kind === "Return" &&
    action.cost?.kind === "place" &&
    action.cost.storeAs !== undefined &&
    action.target.filter.levelLte === action.cost.storeAs;
  if (
    action.kind === "Return" &&
    action.cost !== undefined &&
    action.allowCostWithoutTarget !== true &&
    !returnsLooseCard &&
    !returnBoundProducedByCost &&
    action.target.filter.dpLessOrEqualToSuspendedDigimon !== true &&
    (await resolvePermanentTargets(ctx, action.target)).length === 0
  ) {
    return action.abortOnDecline === true;
  }
  const dynamicallyScaledDeleteTarget =
    action.kind === "Delete" &&
    (action.dpCeilingScaling !== undefined ||
      action.totalDpCapScaling !== undefined ||
      action.playCostCeiling !== undefined ||
      action.scaling !== undefined ||
      action.target.filter?.playCostLteScaling !== undefined);
  const actionCost = action.kind === "DigivolveViaPlacement" ? undefined : action.cost;
  const payableActionCost =
    actionCost !== undefined && typeof actionCost !== "number" ? borrowedProcessingCost(ctx, actionCost) : actionCost;
  const forceOptionalCostProcessing =
    ctx.borrowedEffectOverrides?.forceCostProcessing === true &&
    action.optional === true &&
    isCostBearingAction(action);
  const additionalCost = action.kind === "RawUnparsed" ? undefined : action.additionalCost;
  const additionalCosts = action.kind === "RawUnparsed" ? [] : (action.additionalCosts ?? []);
  const placementCosts = [
    ...(actionCost?.kind === "place" ? [actionCost] : []),
    ...(additionalCost?.kind === "place" ? [additionalCost] : []),
    ...additionalCosts.filter((cost): cost is Cost => cost.kind === "place"),
  ];
  const placeCostProducesDeleteTarget =
    action.kind === "Delete" &&
    placementCosts.some(
      (cost) =>
        (cost.storeAs !== undefined && action.target.filter.levelEq === cost.storeAs) ||
        (cost.storeAs !== undefined &&
          action.target.filter.levelComparison?.scaling?.unit === "namedCount" &&
          action.target.filter.levelComparison.scaling.countSource === cost.storeAs) ||
        (cost.bindHostAs !== undefined && action.target.filter.relativeTo?.selectionRef === cost.bindHostAs) ||
        (cost.bindResultAs !== undefined && action.target.filter.levelComparison?.relativeTo === cost.bindResultAs),
    );
  // A "by deleting 1 of your Digimon, delete 1 with a level no higher than it" target
  // cannot be matched until the deleteOwn cost captures `lastDeletedLevel`.  Preflighting
  // it before payment makes the target set look empty and silently skips the whole action.
  const deleteOwnCost =
    action.kind === "Delete" &&
    action.cost !== undefined &&
    typeof action.cost !== "number" &&
    action.cost.kind === "deleteOwn"
      ? action.cost
      : undefined;
  const deleteTargetLevelBoundByItsCost =
    action.kind === "Delete" &&
    deleteOwnCost !== undefined &&
    action.target.filter.levelComparison?.relativeTo === "lastDeleted";
  const deleteTargetDPBoundByItsCost =
    action.kind === "Delete" && deleteOwnCost !== undefined && action.target.filter.dp?.relativeTo === "lastDeleted";
  const deleteTargetBoundByItsCost = deleteTargetLevelBoundByItsCost || deleteTargetDPBoundByItsCost;
  const deleteOwnBoundedTargetAvailable = (() => {
    if (action.kind !== "Delete" || !deleteTargetBoundByItsCost || deleteOwnCost.target === undefined) return false;
    if (deleteTargetDPBoundByItsCost) {
      const highestCostDP = Math.max(
        ...candidatePermanents(ctx, deleteOwnCost.target).map((permanent) => permanent.currentDP),
        0,
      );
      const { dp: _dp, ...filterWithoutBound } = action.target.filter;
      return candidatePermanents(ctx, { ...action.target, filter: filterWithoutBound }).some(
        (permanent) => permanent.currentDP <= highestCostDP,
      );
    }
    const highestCostLevel = Math.max(
      ...candidatePermanents(ctx, deleteOwnCost.target)
        .map((permanent) => {
          const card = ctx.game.permanentById(permanent.permanentId)?.topCard;
          return card === undefined ? 0 : (ctx.game.definitionOf(card).level ?? 0);
        })
        .filter((level) => level > 0),
      0,
    );
    if (highestCostLevel === 0) return false;
    const { levelComparison: _levelComparison, ...filterWithoutBound } = action.target.filter;
    return candidatePermanents(ctx, { ...action.target, filter: filterWithoutBound }).some((permanent) => {
      const card = ctx.game.permanentById(permanent.permanentId)?.topCard;
      return card !== undefined && (ctx.game.definitionOf(card).level ?? 0) <= highestCostLevel;
    });
  })();
  const looseCostDefinesDeleteTarget =
    action.kind === "Delete" &&
    payableActionCost !== undefined &&
    typeof payableActionCost !== "number" &&
    payableActionCost.bindResultAs !== undefined &&
    (action.target.filter.sameNameAsSelection === payableActionCost.bindResultAs ||
      action.target.filter.relativeTo?.selectionRef === payableActionCost.bindResultAs);
  if (
    action.kind === "Delete" &&
    looseCostDefinesDeleteTarget &&
    typeof payableActionCost !== "number" &&
    !looseCostCanProduceDeleteTarget(ctx, action, payableActionCost)
  ) {
    return action.abortOnDecline === true;
  }
  if (
    action.kind === "Delete" &&
    action.cost !== undefined &&
    action.allowCostWithoutTarget !== true &&
    !dynamicallyScaledDeleteTarget &&
    !placeCostProducesDeleteTarget &&
    !looseCostDefinesDeleteTarget &&
    (!deleteTargetBoundByItsCost || !deleteOwnBoundedTargetAvailable) &&
    candidatePermanents(ctx, targetAfterSelfPlacementCost(ctx, action) ?? action.target).length === 0
  ) {
    return action.abortOnDecline === true;
  }
  // Target-bearing source-trash and binding actions must not consume a Digi-Burst (or other
  // activation) cost when their target pool is empty. Return/Delete already have equivalent
  // preflights above; BT4-032 uses TrashDigivolution, BT4-033 uses SelectBind before the
  // subsequent bounce, and BT4-068 gates De-Digivolve with Digi-Burst, so leaving these
  // target-bearing verbs to pay first makes a no-target activation
  // silently trash the source stack (CR §15-8-4-4-1).
  if (
    (action.kind === "TrashDigivolution" || action.kind === "SelectBind" || action.kind === "DeDigivolve") &&
    action.cost !== undefined &&
    action.allowCostWithoutTarget !== true &&
    candidatePermanents(ctx, action.target).length === 0
  ) {
    return action.abortOnDecline === true;
  }
  // A breeding move with a processing cost is possible only when the controller's current
  // breeding Digimon satisfies the printed target filter. Preflight before the optional prompt
  // and generic cost path so an ineligible Lv.-/0-DP card cannot suspend or otherwise pay for a
  // move that the board handler will reject (BT14-088, Q2463).
  if (action.kind === "MovePermanent" && action.direction === "toBattle") {
    const bred = ctx.game.player(ctx.source.ownerSeat).breeding;
    const eligible =
      bred?.topCard !== undefined &&
      ctx.game.definitionOf(bred.topCard).level !== undefined &&
      (action.target === undefined || permanentMatchesFilter(ctx, bred, action.target.filter, ctx.source));
    if (!eligible) return action.abortOnDecline === true;
  }
  if (
    action.kind === "Unsuspend" &&
    action.cost !== undefined &&
    action.allowCostWithoutTarget !== true &&
    !(action.cost.bindHostAs !== undefined && action.cost.bindHostAs === action.target.fromSelectionRef) &&
    (await resolvePermanentTargets(ctx, action.target)).every((id) => {
      const permanent = ctx.game.permanentById(id);
      return permanent === undefined || permanent.isSuspended !== true;
    })
  ) {
    return action.abortOnDecline === true;
  }
  if (action.kind === "PlaceUnder" && action.cost !== undefined && !canAttemptPlaceUnder(ctx, action)) {
    return action.abortOnDecline === true;
  }
  // A breeding-area play with a printed activation cost is transactional: an occupied
  // single-slot destination makes the action impossible before any optional prompt or cost
  // payment. The play primitive retains the same guard for destination safety, while this
  // preflight prevents BT23-084-style compound costs from being consumed by a guaranteed no-op.
  if (
    action.kind === "PlayWithoutCost" &&
    (action.requiresEmpty === "breedingArea" || action.breeding === true) &&
    ctx.game.player(ctx.source.ownerSeat).breeding !== undefined
  ) {
    return action.abortOnDecline === true;
  }
  if (
    action.kind === "CostModifier" &&
    action.existingPermanent === true &&
    (action.target === undefined || candidatePermanents(ctx, action.target).length === 0)
  ) {
    return action.abortOnDecline === true;
  }
  // Unless a ruling explicitly allows paying the processing condition by itself, a redirect's
  // activation cost is payable only when the attack can actually be redirected. Preflight
  // candidates before the optional prompt and generic cost path; otherwise a card such as
  // BT26-092 can return its Tamer even though no eligible TS Digimon exists to receive the attack.
  if (
    action.kind === "RedirectAttack" &&
    action.mode !== "endAttack" &&
    action.includePlayer !== true &&
    action.allowCostWithoutTarget !== true
  ) {
    const target =
      action.chooser === "opponent"
        ? { ...action.target, filter: { ...action.target.filter, controller: "opponent" as const } }
        : action.target;
    if (candidatePermanents(ctx, target).length === 0) return action.abortOnDecline === true;
  }
  const structuredCost = action.kind !== "RawUnparsed" && typeof action.cost !== "number" ? action.cost : undefined;
  if (action.kind === "CostModifier" && action.amount === null && action.dynamicFrom === "deletedDigimonPlayCost") {
    unsupported(ctx, action, "dynamic deleted-Digimon play-cost modifier must be nested under wouldBePlayed");
    return false;
  }
  const costCreatesTrashCandidate =
    structuredCost?.kind === "trashBottomFaceDownUnderTamer" ||
    structuredCost?.kind === "trashBottomFaceDownUnderDigimon" ||
    // EX9-063: a payable hidden-source cost may itself supply the trash play.
    // Do not inspect its hidden identity to gate payment; the play resolver
    // rebuilds and filters the now-public trash pool after the cost resolves.
    (action.kind === "PlayWithoutCost" &&
      action.from?.includes("trash") === true &&
      structuredCost?.kind === "trash" &&
      structuredCost.target?.filter.zone === "digivolutionCards" &&
      structuredCost.target.filter.faceDown === true &&
      canPayCost(ctx, structuredCost));
  const nestedRequiredOptionUse =
    action.kind === "CostGatedBlock" &&
    action.actions.length === 1 &&
    action.actions[0]?.kind === "UseOptionWithoutCost"
      ? action.actions[0]
      : undefined;
  if (
    nestedRequiredOptionUse?.selectionRequired === true &&
    !(await canAttemptUseOptionWithoutCost(ctx, nestedRequiredOptionUse))
  ) {
    return action.kind === "CostGatedBlock" && action.abortOnDecline === true;
  }
  if (
    action.kind === "UseOptionWithoutCost" &&
    action.cost !== undefined &&
    action.allowCostWithoutTarget !== true &&
    !(await canAttemptUseOptionWithoutCost(ctx, action))
  ) {
    return action.abortOnDecline === true;
  }
  // Bind a SelectBind target before paying a cost that refers to that selected host.
  if (action.kind === "SelectBind" && action.target.bindAs !== undefined && action.cost?.kind === "trash") {
    const boundTo =
      action.cost.target?.filter !== undefined && "boundTo" in action.cost.target.filter
        ? action.cost.target.filter.boundTo
        : undefined;
    if (boundTo === action.target.bindAs && ctx.selections?.get(boundTo) === undefined) {
      const ids = await resolvePermanentTargets(ctx, action.target);
      if (ids.length === 0) return action.abortOnDecline === true;
      ctx.selections?.set(boundTo, ids[0]!);
    }
  }
  // A BeforePayCost CostModifier may carry the printed payment required to earn its
  // reduction (BT26-098). CostModifier is normally excluded from the generic activation
  // cost path because passive modifiers have no cost; an explicit cost is different and
  // must be paid before installing the modifier.
  const interactiveDigivolveReduction =
    action.kind === "CostModifier" &&
    action.target === undefined &&
    action.costType === "digivolve" &&
    action.mode === "reduce" &&
    action.duration === "nextDigivolveThisTurn" &&
    action.cost?.kind === "trash" &&
    action.cost.target === undefined;
  let costModifierPaidCount: number | undefined;
  if (action.kind === "CostModifier" && action.cost !== undefined && !interactiveDigivolveReduction) {
    if (
      action.optional &&
      !forceOptionalCostProcessing &&
      !(await ctx.ask.optional(ctx, `Pay cost: ${describeCost(action.cost)}?`))
    ) {
      return action.abortOnDecline === true;
    }
    const payment = { paidCount: 0 };
    const paid = await payCost(ctx, payableActionCost as Cost, payment);
    if (!paid) return action.abortOnDecline === true;
    costModifierPaidCount = payment.paidCount;
  }
  // "You may" — ask the controller. Skip the prompt when the action carries a cost that is
  // provably unpayable (e.g. a "by trashing your security" cost with an empty security stack):
  // offering "you may…" for an effect the controller cannot perform is misleading. The cost
  // path below still runs, fails cleanly, and yields the same abort semantics — just no prompt.
  if (
    action.kind !== "RawUnparsed" &&
    action.kind !== "SubTrigger" &&
    action.kind !== "Replacement" &&
    action.kind !== "CostModifier" &&
    // A color waiver is a legality permission, not an effect activation. Printed
    // "you may use this card without meeting its color requirements" means the
    // player may choose to USE the card; asking again while recomputing a hand
    // card makes the permission inert in continuous contexts (EX1-071, BT6 Options).
    action.kind !== "WaiveColorRequirement" &&
    action.optional &&
    // An opponent-directed optional trash is THEIR up-to selection. Let the Trash
    // resolver ask that opponent and record a zero-card choice as a decline for
    // the printed "if they don't" tail (BT13-102), instead of opening a separate
    // source-controller prompt that loses the opponent-decline receipt.
    (action.kind !== "Trash" || action.chooser !== "opponent") &&
    // An opponent-directed optional play is THEIR up-to card selection. The
    // PlayWithoutCost resolver routes it through ctx.ask.opponent and a zero-card
    // selection records that the preceding action did not act.
    (action.kind !== "PlayWithoutCost" || action.target.chooser !== "opponent") &&
    // RedirectAttack with chooser:"opponent" owns its optional decline at the combat
    // primitive so the defending player, rather than the source controller, decides
    // whether to switch targets (BT4-075 / Q1224-Q1227).
    (action.kind !== "RedirectAttack" || action.chooser !== "opponent") &&
    !forceOptionalCostProcessing &&
    actionCost?.optional !== true
  ) {
    if (action.kind === "PlaceUnder" && !canAttemptPlaceUnder(ctx, action)) {
      return action.abortOnDecline === true;
    }
    // An optional hatch is meaningful only when it can move the top Digi-Egg into
    // an empty breeding slot. Do this before opening the confirmation so the UI
    // never offers an action that the Hatch primitive would immediately no-op.
    if (action.kind === "Hatch") {
      const owner = ctx.game.player(ctx.source.ownerSeat);
      if (owner.breeding !== undefined || owner.eggDeck.length === 0) return false;
    }
    if (
      action.kind === "SecurityManipulation" &&
      action.op === "toHand" &&
      ctx.game.player(ctx.source.ownerSeat).security.length === 0
    ) {
      return action.abortOnDecline === true;
    }
    // Do not offer an optional play when no legal loose card exists. Besides avoiding a
    // meaningless UI prompt, this is required for nested entry windows: Nokia played from
    // security must finish resolving when the controller has no Agumon/Gabumon to play.
    if (
      action.kind === "PlayWithoutCost" &&
      !costCreatesTrashCandidate &&
      !action.target?.isSelf &&
      action.target?.filter?.isSelfRef !== true &&
      action.fromOwnDigivolutionStack !== true
    ) {
      const zones = action.from && action.from.length > 0 ? action.from : DEFAULT_PLAY_ZONES;
      const levelComparison = action.target.filter.levelComparison;
      const levelScaledTarget = materializeLevelComparisonScaling(
        action.target,
        levelComparison?.scaling === undefined ? 0 : scaleFactor(ctx, levelComparison.scaling),
      );
      const costCeilingTarget = applyDecodeHostScope(action, applyPlayCostCeiling(ctx, action, levelScaledTarget));
      const preflightTarget =
        ctx.playLevelCeilingDelta === undefined || ctx.playLevelCeilingDelta === 0
          ? costCeilingTarget
          : {
              ...costCeilingTarget,
              filter: {
                ...costCeilingTarget.filter,
                levelComparison:
                  costCeilingTarget.filter.levelComparison?.op === "lte" &&
                  costCeilingTarget.filter.levelComparison.value !== undefined
                    ? {
                        ...costCeilingTarget.filter.levelComparison,
                        value: costCeilingTarget.filter.levelComparison.value + ctx.playLevelCeilingDelta,
                      }
                    : costCeilingTarget.filter.levelComparison,
              },
            };
      const sameColorAsReturned = preflightTarget.filter.sameColorAsReturned === true;
      const staticPreflightTarget = sameColorAsReturned
        ? { ...preflightTarget, filter: { ...preflightTarget.filter, sameColorAsReturned: undefined } }
        : preflightTarget;
      let candidates = candidateLooseInstances(ctx, staticPreflightTarget, zones).filter(
        (candidate) => !ctx.fx.isPlayProhibited?.(ctx.source.ownerSeat, candidate.cardId, "play"),
      );
      // A return-cost clause can define the play target's color dynamically. Preflight the
      // pair transactionally: at least one currently returnable card must share a color with
      // at least one currently playable card, otherwise paying the return first would strand
      // the optional payload (EX10-068, Q5181/Q5182).
      if (sameColorAsReturned && action.cost?.kind === "return" && action.cost.target !== undefined) {
        const returnTarget = action.cost.target;
        const returnZones = zoneList(returnTarget.filter.zone ?? "trash");
        const returnable = candidateLooseInstances(ctx, returnTarget, returnZones);
        const returnableColors = new Set(
          returnable.flatMap((candidate) => ctx.game.definitionOf({ cardId: candidate.cardId } as never).colors),
        );
        candidates = candidates.filter((candidate) =>
          ctx.game
            .definitionOf({ cardId: candidate.cardId } as never)
            .colors.some((color) => returnableColors.has(color)),
        );
      }
      // A paid play with an activation cost must be transactional: do not offer it when
      // every legal target is unaffordable, otherwise the generic cost path below can move
      // the source card before `playInstances` discovers that memory cannot be paid.
      // DigiXros material selection can make an otherwise-unaffordable card legal later,
      // so defer that more complex shape to the play resolver.
      if (action.payCost === true && action.allowDigiXros !== true && ctx.fx.canAffordEffectPlay !== undefined) {
        const costDelta =
          (action.reduceCostBy ?? 0) +
          (action.reduceCostByScaling === undefined ? 0 : scaleFactor(ctx, action.reduceCostByScaling));
        const affordability = await Promise.all(
          candidates.map(async (candidate) => ({
            candidate,
            affordable: await ctx.fx.canAffordEffectPlay!(candidate.instanceId, { costDelta }),
          })),
        );
        candidates = affordability.filter(({ affordable }) => affordable).map(({ candidate }) => candidate);
      }
      if (candidates.length === 0) return false;
    }
    // A PlaceUnder confirmation is actionable only when both sides of the move exist:
    // at least one eligible loose card and at least one legal destination host. Without
    // this preflight, cards such as BT8-104 published a "Place 1 card(s) under" decision
    // even with no X-Antibody card in hand, leaving the UI to confirm a guaranteed no-op.
    if (action.kind === "PlaceUnder" && !canAttemptPlaceUnder(ctx, action)) return false;
    // A targeted PlaceInBattleAreaSelf shape is actually "place 1 matching Option from
    // hand" (the Four Great Dragons On Deletion family), not literal self-placement.
    // Skip its optional confirmation when the source zone has no legal candidate.
    if (action.kind === "PlaceInBattleAreaSelf" && action.target !== undefined) {
      const zones = action.target.from ?? action.target.source ?? action.target.zone ?? "hand";
      const candidates = candidateLooseInstances(
        ctx,
        action.target,
        (Array.isArray(zones) ? zones : [zones]) as ZoneRef[],
      );
      if (candidates.length === 0) return false;
    }
    // A Return confirmation is actionable only when at least one legal source exists.
    // This covers optional recovery from trash (EX3-068) as well as optional bounce:
    // never ask the player to confirm a move that has no selectable card or permanent.
    if (
      action.kind === "Return" &&
      !action.target.isSelf &&
      action.target.filter.isSelfRef !== true &&
      !(action.from ?? []).includes("digivolutionCards")
    ) {
      const zone = action.target.filter.zone;
      const looseZones = action.from ?? (zone !== undefined && zone !== "battleArea" ? zoneList(zone) : undefined);
      // Only preflight loose-zone recovery here. A battle-area Return may have an
      // activation cost that changes target legality (BT16-048 suspends the Digimon
      // whose DP becomes the bounce ceiling), so its candidates must be resolved
      // after payment by the normal action path.
      if (looseZones !== undefined && candidateLooseInstances(ctx, action.target, looseZones).length === 0) {
        // Paying a trash cost can itself create the recovery target: BT21-056 trashes a
        // [Vemmon]-text card from hand and may then return a matching card from the trash —
        // legal even when the trash starts empty, because the trashed cost card qualifies.
        // Offer the confirmation only when some payable cost card would match the Return filter.
        const trashCost = action.cost?.kind === "trash" ? action.cost : undefined;
        const costCreatesRecoveryCandidate = (): boolean => {
          if (trashCost?.target === undefined || !looseZones.includes("trash")) return false;
          const costZones = zoneList(trashCost.target.filter.zone ?? "hand");
          const payable = new Set(candidateLooseInstances(ctx, trashCost.target, costZones).map((c) => c.instanceId));
          if (payable.size === 0) return false;
          const zonelessReturnTarget = { ...action.target, filter: { ...action.target.filter, zone: undefined } };
          return candidateLooseInstances(ctx, zonelessReturnTarget, costZones).some((c) => payable.has(c.instanceId));
        };
        if (!costCreatesRecoveryCandidate()) return false;
      }
    }
    // A "may digivolve" prompt is meaningful only when at least one matching source and
    // destination form a legal digivolution. In particular, "without paying the cost" does
    // not waive printed requirements (P-092 Q4182); do this before asking so the UI never
    // confirms an evolution the resolver will immediately discard.
    if (action.kind === "Digivolve") {
      // The placement cost binds the exact base that the following digivolve must use.
      // Before payment that binding does not exist, so preflight against the cost's host
      // filter instead. This keeps the cost transactional: no legal trash/hand evolution
      // means the source card is not first moved under the host (EX10-066).
      const hostBindingFilter =
        action.cost?.kind === "place" &&
        action.cost.bindHostAs !== undefined &&
        action.cost.bindHostAs === action.target.fromSelectionRef
          ? (action.cost.underFilter ??
            (action.cost.host !== undefined && action.cost.host !== null && typeof action.cost.host === "object"
              ? action.cost.host.filter
              : undefined))
          : undefined;
      const canAttempt =
        hostBindingFilter === undefined
          ? canAttemptDigivolve(ctx, action)
          : canAttemptDigivolve(ctx, {
              ...action,
              target: { filter: hostBindingFilter, count: 1 },
            });
      if (!canAttempt) return false;
    }
    const costUnpayable = payableActionCost !== undefined && !canPayCost(ctx, payableActionCost as Cost);
    if (!costUnpayable) {
      const yes = await ctx.ask.optional(ctx, describeAction(action));
      if (!yes) {
        // `ifThisEffectDidNotAct` belongs to the immediately preceding action. A declined
        // optional action acted zero times, so clear any success receipt left by an earlier
        // action in the same effect before its "if they didn't" continuation is evaluated.
        ctx.lastEffectActed = false;
        if ((action as Action & { preserveOncePerTurnOnDecline?: boolean }).preserveOncePerTurnOnDecline === true) {
          ctx.oncePerTurnActivationDeclined = true;
        }
        return action.abortOnDecline === true;
      }
    }
  }
  // Pay a per-action cost first; abort the action if it cannot be paid. An OPTIONAL
  // resolves with no payment when they do. A Replacement carries its cost as the
  // prevention/cost-reduction gate paid by its OWN machinery (preventCheck), NOT up
  // front at install time, so it is excluded here.
  // The paid count of an "up to N" cost (BT7-040 <Digi-Burst up to 4>) drives this action's
  // scaling (-3000 per card actually trashed); a fixed-count cost leaves it undefined.
  const costPayment = { paidCount: 0 };
  let deferredCostSuspensions: string[] = [];
  // PlayPerLevel owns its own cost validation and payment (level-sum budget logic that the
  // standard payCost path cannot express); skip the generic cost gate so it is not double-paid.
  if (
    action.kind !== "RawUnparsed" &&
    action.kind !== "Replacement" &&
    action.kind !== "CostModifier" &&
    action.kind !== "SubTrigger" &&
    action.kind !== "CostGatedBlock" &&
    action.kind !== "PlayPerLevel" &&
    (action.costOptions?.length ?? 0) > 0
  ) {
    const paid = await payOneCostOption(ctx, action.costOptions as Cost[], costPayment);
    if (!paid) return action.abortOnDecline === true;
  } else if (
    action.kind !== "RawUnparsed" &&
    action.kind !== "Replacement" &&
    action.kind !== "CostModifier" &&
    action.kind !== "SubTrigger" &&
    action.kind !== "CostGatedBlock" &&
    action.kind !== "PlayPerLevel" &&
    // `DigivolveViaPlacement.cost` is a memory amount paid by the digivolve itself, not an
    // activation Cost, so it must not enter the generic cost-payment path.
    action.kind !== "DigivolveViaPlacement" &&
    payableActionCost
  ) {
    if (payableActionCost.optional) {
      const willPay =
        forceOptionalCostProcessing || (await ctx.ask.optional(ctx, `Pay cost: ${describeCost(payableActionCost)}?`));
      if (willPay) {
        const paid = await payCost(ctx, payableActionCost, costPayment);
        if (!paid) return action.abortOnDecline === true;
      } else if (action.abortOnDecline === true) {
        // A clause may make only its processing condition optional; refusal skips
        // the remaining effect even when the payload itself is not optional.
        return true;
      }
    } else {
      const deferSuspendTriggers = action.kind === "Attack" && payableActionCost.kind === "suspend";
      const paid = await payCost(ctx, payableActionCost, costPayment, { deferSuspendTriggers });
      if (paid && deferSuspendTriggers) deferredCostSuspensions = [...(ctx.lastSuspendedPermanentIds ?? [])];
      if (!paid) {
        // An unpayable ACTIVATION cost ("By [paying X], [effect]. Then …") means the entire
        // ability does nothing, so abort the REMAINING actions of this effect too — otherwise
        // a downstream "Then …" payload (or a self-place security continuation) would resolve
        // for free off a cost-bearing head action that silently failed. Explicit
        // `abortOnDecline` means the IR author intended this cost/action to gate the
        // remaining clause as well. Two legacy activation-cost shapes also gate their whole
        // clause even when the IR omitted `abortOnDecline`: <Digi-Burst N> (trash from THIS
        const isDigiBurstCost =
          payableActionCost.kind === "trash" &&
          payableActionCost.target?.filter.zone === "digivolutionCards" &&
          payableActionCost.target.filter.isSelfRef === true;
        const isSecurityTrashCost =
          payableActionCost.kind === "trash" && payableActionCost.target?.filter.zone === "security";
        return action.abortOnDecline === true || isDigiBurstCost || isSecurityTrashCost;
      }
    }
  }
  // When both the processing condition and payload are optional, pay the former
  // first, then offer the payload choice (e.g. Q6255: trash, then decline return).
  if (action.kind !== "RawUnparsed" && action.optional && actionCost?.optional === true) {
    const yes = await ctx.ask.optional(ctx, describeAction(action));
    if (!yes) {
      ctx.lastEffectActed = false;
      return action.abortOnDecline === true;
    }
  }
  if (
    action.kind !== "RawUnparsed" &&
    action.kind !== "Replacement" &&
    action.kind !== "CostModifier" &&
    action.kind !== "SubTrigger" &&
    action.kind !== "PlayPerLevel" &&
    action.kind !== "DigivolveViaPlacement"
  ) {
    const extraCosts = [
      ...((action.additionalCosts ?? []) as Cost[]),
      ...(action.additionalCost !== undefined ? [action.additionalCost as Cost] : []),
    ];
    for (const extraCost of extraCosts) {
      const paid = await payCost(ctx, extraCost, costPayment);
      if (!paid) return action.abortOnDecline === true;
    }
  }
  // An "up to N" <Digi-Burst> cost scales its action by the number of cards actually paid
  //. The runtime record omits the `scaling` hint for
  // this case, so the paid count is the sole scale factor — overriding the residual-stack read
  // scaleFactor would otherwise return for a `digivolutionCards` unit.
  const digiBurstScale =
    action.kind !== "RawUnparsed" &&
    action.kind !== "DigivolveViaPlacement" &&
    action.cost?.kind === "trash" &&
    action.cost.target?.upTo === true
      ? (costModifierPaidCount ?? costPayment.paidCount)
      : undefined;
  // The upTo-Digi-Burst paid count and a `scaling` ("for each") hint are two
  // independent multipliers; the current catalog never carries both (BT7-040 is the
  // only upTo-Digi-Burst and has no scaling). Silently letting the paid count win
  // would drop a real scaling factor and produce a wrong multiplier — surface it
  // loudly instead of guessing how to combine them.
  // For an up-to Digi-Burst cost, `digiBurstScale` is the authoritative
  // multiplier. A coexisting scaling hint is the printed "for each card
  // trashed" wording, not a second board count (EX10-033).
  // Scaling ("for each/every"): compute the multiplier from live state and apply it
  // to the amount (Draw/GainMemory/ModifyDP/ModifySecurityDP) or the target count
  // (Delete/Trash/Return/... ). A factor of 0 means the action does nothing.
  // A `usePaidCount` scaling reads the count of cards actually paid by THIS action's cost
  // ("for every Tamer this effect suspended", BT17-041) rather than re-counting the board.
  const paidCountScale =
    action.kind !== "RawUnparsed" && (action.scaling?.usePaidCount === true || costModifierPaidCount !== undefined)
      ? Math.floor(
          (costModifierPaidCount ?? costPayment.paidCount) /
            (action.scaling?.per && action.scaling.per > 0 ? action.scaling.per : 1),
        )
      : undefined;
  const scale =
    digiBurstScale !== undefined
      ? digiBurstScale
      : paidCountScale !== undefined
        ? paidCountScale
        : action.kind !== "RawUnparsed" && action.scaling
          ? scaleFactor(ctx, action.scaling)
          : undefined;
  // A scale of 0 makes a "for each X" action do nothing — EXCEPT a SET cost-modifier,
  // where a count of 0 is a meaningful absolute cost (e.g. "cost = your security count"
  // with an empty security stack sets the cost to 0). That case resolves its own value.
  const isSetCostModifier = action.kind === "CostModifier" && action.mode === "set";
  // A ceiling bonus changes an action's eligibility, not its base count. With zero
  // matching units the action still resolves at its printed ceiling (ST21-11).
  const isLevelCeilingScaling = action.scaling?.levelCeilingAdd !== undefined;
  // A budget scaling ("for every 2 [Argomon] in its digivolution cards, +1 to the maximum",
  // BT17-051) raises a BASE budget the action carries on its own. Zero units means no bonus,
  // never "the action does nothing" — the base budget still deletes.
  const isBudgetScaling = action.kind !== "RawUnparsed" && action.scaling?.budgetAdd !== undefined;
  // targetColors is resolved after the action's permanent target is selected; it intentionally
  // has no board-wide scaleFactor. Do not let the generic zero guard abort it before dispatch.
  const isPerTargetScaling =
    action.scaling?.unit === "targetColors" || action.scaling?.unit === "targetFaceDownDigivolutionCards";
  if (
    scale !== undefined &&
    scale === 0 &&
    !isPerTargetScaling &&
    !isSetCostModifier &&
    !isLevelCeilingScaling &&
    !isBudgetScaling
  ) {
    return false;
  }

  // Everything the prologue worked out that a case body still needs.
  const scope: ActionScope = { scale, deferredCostSuspensions };

  switch (action.kind) {
    case "Draw":
    case "GainMemory":
    case "PayMemoryUpTo":
    case "SetMemory":
    case "SetTurnEndMemory":
    case "TrashTopDeck":
    case "ReducePlayCost":
    case "CostModifier":
      return await runResourceAction(ctx, action, scope);
    case "Delete":
    case "DeletePerColor":
    case "DeleteUntilCount":
    case "DeleteBudget":
    case "DeleteLevelBudget":
    case "DeleteByDPBudget":
    case "AddToDPDeleteBudget":
    case "Trash":
    case "ReturnToEggDeck":
    case "Return":
    case "ReturnTopDigivolutionCards":
    case "DeletionMaxDpModifier":
    case "DelayedDelete":
    case "DelayedDeletePlayed":
      return await runRemovalAction(ctx, action, scope);
    case "HandManipulation":
    case "Suspend":
    case "Unsuspend":
    case "RepeatPerCount":
    case "MovePermanent":
    case "Hatch":
    case "ModifyDP":
    case "AddDPFromTrashedCard":
    case "AddDPFromSuspendedCost":
    case "SetBaseDP":
    case "GainKeyword":
    case "AddToHandSelf":
    case "PlaceInBattleAreaSelf":
      return await runBoardAction(ctx, action, scope);
    case "PlayMultiple":
    case "PlayWithoutCost":
    case "PlayFromZone":
    case "PlayToken":
    case "PlayPerLevel":
      return await runPlayAction(ctx, action, scope);
    case "Restrict":
    case "DeclareCategoryImmunity":
    case "RestrictUnsuspendedDigivolve":
    case "RestrictDigivolveInto":
    case "MinDpFloor":
    case "StackTrashLock":
    case "RestrictMemoryGain":
    case "RestrictCostReduction":
    case "RestrictPlay":
    case "GlobalRestrict":
    case "GrantImmunity":
    case "ArmSuspendRestriction":
    case "DisableTimingEffect":
      return await runRestrictionAction(ctx, action, scope);
    case "Aura":
    case "GrantAuraToOpponents":
    case "WaiveColorRequirement":
      return await runStaticAction(ctx, action);
    case "GrantStatic":
    case "DynamicDigivolutionNames":
      return await runGrantStaticAction(ctx, action);
    case "Attack":
    case "Battle":
    case "RedirectAttack":
    case "SelectBind":
    case "EndAttack":
    case "GrantCanAttackUnsuspended":
    case "GrantVortexCanAttackPlayers":
      return await runCombatAction(ctx, action, scope);
    case "DeDigivolve":
    case "Digivolve":
    case "DigivolveViaPlacement":
    case "DnaDigivolve":
    case "AppFuse":
    case "PlaceUnder":
    case "TrashDigivolution":
    case "Link":
    case "GrantLinkCostReduction":
    case "CannotIgnoreDigivolutionRequirements":
    case "MindLink":
    case "DigiXrosMaterialZoneExpansion":
    case "AllowDigiXrosMaterialsFromTrash":
      return await runDigivolutionAction(ctx, action, scope);
    case "TamerOntoDigivolve":
      return false;
    case "Modal":
    case "ConditionalBranch":
    case "DelayedEffect":
    case "SubTrigger":
    case "Replacement":
    case "Prevent":
    case "GainTriggeredEffect":
    case "GainEffect":
    case "CostGatedBlock":
    case "RestrictEffect":
      return await runControlFlowAction(ctx, action);
    case "ActivateMain":
    case "ActivateOptionMain":
    case "WinGame":
    case "ReactivateEffect":
    case "ActivateForeignEffect":
    case "ActivateEffect":
    case "UseOptionWithoutCost":
    case "RawUnparsed":
      return await runMetaAction(ctx, action);
    case "OpponentMayTrashSecurity":
    case "SecurityManipulation":
    case "RecoverByTrashingMostSecurity":
    case "Recover":
    case "trashSecurityTop":
    case "ModifySecurityDP":
    case "SecurityAttackInvert":
    case "DisableSecurityEffect":
      return await runSecurityAction(ctx, action, scope);
    case "Search":
    case "SearchSecurity":
    case "Look":
    case "Reveal":
    case "RevealAdd":
    case "HandRevealAdd":
    case "RevealChooseDeleteBudget":
      return await runRevealAction(ctx, action);
    default: {
      // The TypeScript union is exhaustive, but effects.json is data. If a catalog
      // action kind is missing from the Action union, JSON loading can still route it
      // here at runtime. Keep that gap loud instead of silently no-oping.
      unsupported(ctx, action as Action, `unknown action kind "${String((action as { kind?: unknown }).kind)}"`);
      return false;
    }
  }
}

installActionRunner(runAction);
