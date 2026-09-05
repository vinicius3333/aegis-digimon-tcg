// Replacing or preventing an event before it happens.

import type { EffectContext, ReplacementEventName } from "../../EffectContext.js";
import { evaluateCondition } from "../conditions.js";
import { canPayCost, payCost, payOneCostOption } from "../costs.js";
import { runAction } from "../dispatch.js";
import { unsupported } from "../errors.js";
import { printedClause } from "../describe.js";
import { scaleFactor } from "../scaling.js";
import { definitionMatches } from "../matching/definition.js";
import { permanentMatchesFilter } from "../matching/permanent.js";
import { candidatePermanents } from "../targeting/permanents.js";
import { canAttemptDnaDigivolve } from "./dna.js";
import { getCardDefinition } from "@aegis/shared";
import type { Action, Condition, Cost, Filter, Permanent, ZoneRef } from "@aegis/shared";

const REPLACEMENT_EVENT_MAP: Record<string, ReplacementEventName | undefined> = {
  wouldLeavePlay: "wouldLeavePlay",
  wouldBeDeleted: "wouldBeDeleted",
  wouldBePlayed: "wouldBePlayed",
  wouldTrashDigivolutionCard: "wouldTrashDigivolutionCard",
  wouldDigivolve: "wouldDigivolve",
  // Hand-authored EX5 wording names the destination explicitly; the engine's
  // replacement seam is the same pre-digivolution window.
  wouldBeDigivolvedInto: "wouldDigivolve",
};

/**
 * Install a replacement effect. `reduceCost` records a cost delta the play/digivolve
 * cost step subtracts; `instead`/`prevent` run a payload when the engine consults the
 * replacement before the replaced event. A "raw" event is a loud gap.
 */
export async function runReplacement(
  ctx: EffectContext,
  action: Extract<Action, { kind: "Replacement" }>,
): Promise<void> {
  const expiresOnTurnEndOf =
    action.duration === "forTheTurn" || action.duration === "untilYourTurnEnd"
      ? ctx.source.ownerSeat
      : action.duration === "untilOpponentTurnEnd" || action.duration === "untilOpponentNextTurnEnd"
        ? ctx.game.opponentOf(ctx.source.ownerSeat)
        : undefined;
  const oncePerTurnKey = action.oncePerTurnKey;
  const replacementBudget =
    oncePerTurnKey === undefined ? {} : { oncePerTurnKey: `${ctx.source.instanceId}/${oncePerTurnKey}` };
  // The prose compiler also emits a CROSS-CARD reduceCost as a nested Replacement — an outer
  // `wouldBePlayed` reaction scoped by `sourceFilter` ("an [Eater] Digimon", not "this card")
  // wrapping the inner `{mode:"reduceCost", amount}` Replacement, rather than setting mode/amount
  // on the outer action itself (BT22-079's [Breeding] resident reducer). Hoisted above the event
  // dispatch because the `wouldTrashDigivolutionCard` branch reads it for its description.
  const nestedCostModifiers = (
    action.actions as
      | {
          kind?: string;
          event?: string;
          mode?: string;
          costType?: string;
          amount?: number | null;
          dynamicFrom?: string;
          condition?: Condition;
          cost?: Cost;
          additionalCost?: Cost;
          additionalCosts?: Cost[];
          sourceFilter?: Filter;
          optional?: boolean;
          scaling?: Extract<Action, { kind: "Replacement" }>["scaling"];
          raw?: string;
        }[]
      | undefined
  )?.filter(
    (a) =>
      (a.kind === "Replacement" &&
        a.event === action.event &&
        (a.mode === "reduceCost" || a.mode === "increaseCost")) ||
      (a.kind === "CostModifier" && a.costType === "play" && a.mode === "reduce"),
  );
  const nestedCostModifier = nestedCostModifiers?.[0];
  const nestedCostMode =
    nestedCostModifier?.kind === "CostModifier"
      ? nestedCostModifier.mode === "reduce"
        ? "reduceCost"
        : undefined
      : nestedCostModifier?.mode;
  const event = REPLACEMENT_EVENT_MAP[action.event];
  if (event === undefined) {
    unsupported(ctx, action, `Replacement event "${action.event}" is not a known game event`);
    return;
  }
  if (action.condition !== undefined && !evaluateCondition(ctx, action.condition)) return;
  // A self-scoped replacement explicitly restricted to the battle area is inactive while
  // its source is in breeding. Other sourceFilter shapes describe the event subject and must
  // remain deferred to the replacement's appliesTo predicate.
  if (
    action.sourceFilter?.isSelfRef === true &&
    action.sourceFilter.zone === "battleArea" &&
    !ctx.source.isOnBattleArea()
  )
    return;
  const self = ctx.source.permanent();
  const activationIdentity =
    ctx.activeEffectKey === undefined
      ? undefined
      : `${ctx.activeEffectKey}/action-${ctx.activeActionPath ?? "unknown"}`;
  if (event === "wouldDigivolve" && action.mode === "gainMemoryOnDna" && self !== undefined) {
    ctx.fx.subscribeReplacement({
      ...replacementBudget,
      event,
      sourcePermanentId: self.permanentId,
      activationIdentity,
      ...(ctx.activeTiming !== undefined ? { activationTiming: ctx.activeTiming } : {}),
      mode: "gainMemoryOnDna",
      amount: action.amount ?? 0,
      description: action.raw ?? ctx.activeEffectText ?? "Gain memory on DNA digivolution",
      intoMatches: (definition) => action.into === undefined || definitionMatches(action.into, definition),
    });
    return;
  }
  if (event === "wouldTrashDigivolutionCard" && self !== undefined) {
    ctx.fx.subscribeReplacement({
      ...replacementBudget,
      event,
      sourcePermanentId: self.permanentId,
      sourceInstanceId: ctx.source.instanceId,
      activationIdentity,
      ...(ctx.activeTiming !== undefined ? { activationTiming: ctx.activeTiming } : {}),
      ...(ctx.activeEffectText !== undefined ? { activationEffectText: ctx.activeEffectText } : {}),
      mode: "redirect",
      description:
        printedClause(action.raw) ??
        printedClause(ctx.activeEffectText) ??
        printedClause(nestedCostModifier?.raw) ??
        "",
      appliesTo: (subCtx, originalHostId) => {
        const original = subCtx.game.permanentById(originalHostId);
        return (
          original !== undefined &&
          original.controllerSeat === ctx.source.ownerSeat &&
          originalHostId !== self.permanentId &&
          subCtx.game.state.turnSeat !== ctx.source.ownerSeat
        );
      },
      redirectTo: async (subCtx) => {
        // The printed clause rides the decision's `effectText` provenance; the question itself
        // stays plain language so no internal event name can reach the player.
        const clause = printedClause(action.raw) ?? printedClause(ctx.activeEffectText);
        const askCtx = clause === undefined ? subCtx : { ...subCtx, activeEffectText: clause };
        return (await askCtx.ask.optional(askCtx, "Trash a digivolution card from this Digimon instead?"))
          ? self.permanentId
          : undefined;
      },
    });
    return;
  }
  // The prose compiler often emits the prevention as a NESTED `{kind:"Prevent"}` inner action
  // (carrying the prevention's cost) rather than setting `mode:"prevent"` on the Replacement
  // itself — BT18-082 "by trashing the bottom card of your security stack, it doesn't leave".
  // Normalize that shape here so the reaction installs as a real prevent (consulted by the
  // engine's leave-prevention seam) instead of a mode-less dead store the consult skips.
  //
  // A THIRD encoding of the same prevention (BT11-062, BT11-064): a nested `GrantStatic`
  // carrying `grant: { cannotLeavePlay: true }` plus its OWN cost/optional/abortOnDecline,
  // rather than a `{kind:"Prevent"}` sibling. Recognized here alongside it — without this, the
  // outer Replacement defaults to "instead" mode (no cost gate, no protection) and the inner
  // GrantStatic falls through to the engine's fail-loud "no enforcement path" catch-all.
  const isCannotLeavePlayGrant = (grant: unknown): boolean =>
    typeof grant === "object" && grant !== null && (grant as { cannotLeavePlay?: boolean }).cannotLeavePlay === true;
  const nestedPrevent = (
    action.actions as
      | { kind?: string; cost?: Cost; costOptions?: Cost[]; condition?: Condition; grant?: unknown }[]
      | undefined
  )?.find((a) => a.kind === "Prevent" || (a.kind === "GrantStatic" && isCannotLeavePlayGrant(a.grant)));
  // When the prose compiler emits a Replacement with a cost but no explicit
  // mode (e.g. BT18-082 "by trashing the bottom card of your security stack,
  // it doesn't leave"), interpret it as "prevent" — a cost with empty actions
  // can only mean prevention.
  const mode =
    action.mode ??
    (nestedPrevent !== undefined
      ? "prevent"
      : nestedCostModifier !== undefined
        ? nestedCostMode
        : action.cost
          ? "prevent"
          : "instead");
  let amount: number | undefined =
    (typeof action.amount === "number" ? action.amount : undefined) ??
    nestedCostModifiers?.reduce(
      (total, modifier) =>
        total +
        (typeof modifier.amount === "number" ? modifier.amount : 0) *
          (modifier.scaling ? scaleFactor(ctx, modifier.scaling) : 1),
      0,
    );
  const costScaling = action.scaling ?? action.reduceCostScaling;
  const scalesIntoColors = event === "wouldDigivolve" && costScaling?.unit === "colors";
  if (
    (mode === "reduceCost" || mode === "increaseCost") &&
    costScaling !== undefined &&
    amount !== undefined &&
    !scalesIntoColors
  ) {
    amount *= scaleFactor(ctx, costScaling);
  }
  // Mutually-exclusive amount alternatives (EX6-006 "reduce by 3 ... reduce by 4 instead"):
  // only ONE eligible entry ever installs — never both — because `costReductionFor` SUMS every
  // active reduceCost subscription anchored to this permanent, so two simultaneously-installed
  // amounts would silently stack.
  if (mode === "reduceCost" && action.amountChoices && action.amountChoices.length > 0) {
    const eligible = action.amountChoices.filter(
      (choice) => choice.condition === undefined || evaluateCondition(ctx, choice.condition),
    );
    if (eligible.length === 0) return;
    if (eligible.length === 1) {
      amount = eligible[0]!.amount;
    } else {
      const chosen = await ctx.ask.chooseOption(
        ctx,
        eligible.map((choice) => choice.raw ?? `Reduce the play cost by ${choice.amount}.`),
      );
      amount = eligible[chosen]!.amount;
    }
  }
  const preventCost = action.cost ?? nestedPrevent?.cost;
  // A "prevent" leave/delete reaction: install a protects-predicate (which permanents it
  // guards) + a preventCheck (prompt + pay the cost; true => the removal is prevented). The
  // engine's leave-prevention consult runs these when a permanent would be deleted/leave.
  if (mode === "prevent") {
    const protectsFilter = action.target?.filter ?? action.sourceFilter;
    const protectsSelf =
      protectsFilter === undefined || action.target?.isSelf === true || protectsFilter.isSelfRef === true;
    // The reaction's owner seat (whose permanents it protects). Used to gate the removal
    // cause: "your effects" / "opponent's effect" are relative to this seat.
    const ownerSeat = ctx.source.ownerSeat;
    // sourceFilter.leaveReason="effect" is an alternative encoding of leaveCause:"byEffect"
    // (used by cards like BT19-048 where the cause gate is embedded in the sourceFilter
    // rather than the top-level leaveCause field). leaveCause wins when both are present.
    const sourceleaveReason = action.sourceFilter?.leaveReason;
    const leaveCause = action.leaveCause ?? (sourceleaveReason === "effect" ? "byEffect" : "any");
    const exceptDeletion = action.exceptDeletion === true;
    ctx.fx.subscribeReplacement({
      ...replacementBudget,
      event,
      sourcePermanentId: self?.permanentId,
      sourceInstanceId: ctx.source.instanceId,
      activationIdentity,
      mode: "prevent",
      affectsAll: action.affectsAll,
      description: action.raw ?? ctx.activeEffectText ?? nestedCostModifier?.raw ?? "",
      causeAllows: (cause, resolvingSeat, isBounce) => {
        // "Can't leave EXCEPT by deletion" (EX6-044): a deletion (a non-bounce removal) is
        // allowed through; only a move/bounce is prevented (KB EX6-044 Q3771).
        if (exceptDeletion && !isBounce) return false;
        switch (leaveCause) {
          case "opponentEffect":
          case "byOpponentEffect":
            // Only an opponent's effect: removal must be effect-driven by a non-owner seat.
            return cause === "byEffect" && resolvingSeat !== undefined && resolvingSeat !== ownerSeat;
          case "otherThanYourEffect":
            // Anything except the owner's own effect.
            return !(cause === "byEffect" && resolvingSeat === ownerSeat);
          case "byEffect":
            return cause === "byEffect";
          case "byBattle":
            return cause === "byBattle";
          case "otherThanBattle":
            return cause !== "byBattle";
          case "any":
          default:
            return true;
        }
      },
      protects: (subCtx, leavingId) => {
        if (protectsSelf) {
          const leaving = subCtx.game.permanentById(leavingId);
          if (leaving === undefined || subCtx.source.permanent()?.permanentId !== leavingId) return false;
          return (
            action.sourceFilter === undefined ||
            permanentMatchesFilter(subCtx, leaving, action.sourceFilter, subCtx.source)
          );
        }
        const leaving = subCtx.game.permanentById(leavingId);
        if (leaving === undefined || protectsFilter === undefined) return false;
        // Controller gate ("any of YOUR Digimon"): permanentMatchesFilter checks definition
        // facts only, not the seat, so a "mine"/"opponent" filter must be honored here against
        // the leaving permanent's controller relative to the reaction's owner.
        if (protectsFilter.controller === "mine" && leaving.controllerSeat !== ownerSeat) return false;
        if (protectsFilter.controller === "opponent" && leaving.controllerSeat === ownerSeat) return false;
        return permanentMatchesFilter(subCtx, leaving, protectsFilter, subCtx.source);
      },
      preventCheck: async (subCtx) => {
        // "You may [pay cost] to prevent" — the cost is the gate. Decline => not prevented.
        if (preventCost !== undefined && !canPayCost(subCtx, preventCost)) return false;
        const availablePreventCosts = action.costOptions ?? nestedPrevent?.costOptions;
        if (availablePreventCosts !== undefined && !availablePreventCosts.some((cost) => canPayCost(subCtx, cost))) {
          return false;
        }
        if (action.optional !== false) {
          // The printed clause is what makes the prompt answerable ("...by returning 4 [Vemmon]
          // from its digivolution cards"). A Prevent compiled without its own `raw` still has
          // the cost's, so fall back through both. `printedClause` drops a `raw` that holds an
          // internal identifier instead of printed text (some cards store the replacement's
          // event name there), so no identifier can reach the player; the source card's own
          // printed effect text is the last resort, so the question is always answerable.
          const preventReason =
            printedClause(action.raw) ??
            printedClause(preventCost?.raw) ??
            printedClause(subCtx.activeEffectText) ??
            printedClause(subCtx.source.definition.effectText);
          // The clause travels as the decision's `effectText` provenance (the channel the
          // client already renders beside the source card), never interpolated into the
          // question itself.
          const askCtx = preventReason === undefined ? subCtx : { ...subCtx, activeEffectText: preventReason };
          const yes = await askCtx.ask.optional(askCtx, "Prevent leaving the battle area?");
          if (!yes) return false;
        }
        if (action.digivolveFromTrash === true) {
          const targetId = subCtx.trigger.deletedPermanentId;
          if (targetId === undefined) return false;
          return (
            (await subCtx.fx.digivolveFromInstance(targetId, subCtx.source.instanceId, { payCost: false })) !==
            undefined
          );
        }
        if (action.playAndRelocateSourceUnder !== undefined) {
          const host = subCtx.source.permanent();
          if (host === undefined) return false;
          const owner = subCtx.game.state.players[subCtx.source.ownerSeat]!;
          const candidates = [
            ...(action.playAndRelocateSourceUnder.from.includes("digivolutionCards") ? host.stack : []),
            ...(action.playAndRelocateSourceUnder.from.includes("trash") ? owner.trash : []),
          ].filter((card) =>
            definitionMatches(action.playAndRelocateSourceUnder!.filter, subCtx.game.definitionOf(card)),
          );
          if (candidates.length === 0) return false;
          const selected = await subCtx.ask.selectCards(subCtx, {
            candidates: candidates.map((card) => card.instanceId),
            min: 1,
            max: 1,
          });
          if (selected.length === 0) return false;
          const played = await subCtx.fx.playInstances(selected, { payCost: false });
          const playedPermanent = played[0];
          if (playedPermanent === undefined) return false;
          return subCtx.fx.relocatePermanent(playedPermanent.permanentId, host.permanentId, { belowTop: true });
        }
        const runCtx: EffectContext =
          action.requiresDelayArmed === true ? { ...subCtx, delayArmedConsumed: true } : subCtx;
        if (action.requiresDelayArmed === true) {
          const source = subCtx.source.permanent();
          if (source === undefined) return false;
          if (source.enterFieldTurnCount === subCtx.game.state.turnCount) return false;
          const hasDelay = (subCtx.fx.grantedKeywords?.(source.permanentId) ?? []).some((g) => g.keyword === "Delay");
          if (!hasDelay) return false;
          subCtx.fx.revokeKeyword?.(source.permanentId, "Delay");
          const trashed = await subCtx.fx.deletePermanent([source.permanentId]);
          if (trashed <= 0) return false;
        }
        // CAP-E14: an intrinsic ＜Delay＞ gate (`withIntrinsicDelayGate`, comprehensive rules
        // §16-17) — the printed keyword's OWN cost, not the separate GainKeyword-armed model
        // above. §16-17-3 bars activation the turn the card entered play; §16-17-1 makes
        // trashing the source card (already asked as the "prevent?" confirm above) the cost.
        if ((action as { delayArmedIntrinsic?: boolean }).delayArmedIntrinsic === true) {
          const source = subCtx.source.permanent();
          if (source === undefined) return false;
          if (source.enterFieldTurnCount === subCtx.game.state.turnCount) return false;
          const trashed = await subCtx.fx.deletePermanent([source.permanentId]);
          if (trashed <= 0 && subCtx.source.permanent() !== undefined) return false;
        }
        const preventCosts = action.costOptions ?? nestedPrevent?.costOptions ?? (preventCost ? [preventCost] : []);
        if (preventCosts.length > 0) {
          const paid = await payOneCostOption(subCtx, preventCosts);
          if (!paid) return false;
        }
        for (const inner of action.actions ?? []) {
          if (inner.kind === "Prevent") continue;
          if (inner.kind === "GrantStatic" && isCannotLeavePlayGrant((inner as { grant?: unknown }).grant)) continue;
          const abort = await runAction(runCtx, inner);
          if (abort) break;
        }
        if (nestedPrevent?.condition !== undefined && !evaluateCondition(runCtx, nestedPrevent.condition)) {
          return false;
        }
        return true;
      },
    });
    return;
  }
  // The mode/amount hoist above lifts a nested reduceCost Replacement's own gate too — dropping
  // it would install the cost reduction UNCONDITIONALLY. This is the one reduceCost path the
  // engine actually consumes for digivolve costs (GameEngine's wouldDigivolve costReductionFor),
  // so a dropped condition here silently discounts every digivolve, condition or not
  // (P-117/BT13-049/BT13-050/EX2-026/BT14-044's "you have a [green] Tamer" gate).
  if (
    mode === "reduceCost" &&
    nestedCostModifier?.condition !== undefined &&
    !evaluateCondition(ctx, nestedCostModifier.condition)
  ) {
    return;
  }
  const intoFilter = action.into;
  const replacementSourceFilter = action.sourceFilter ?? nestedCostModifier?.sourceFilter;
  if (mode === "reduceCost" || mode === "increaseCost") {
    // Nested cost-reduction IR keeps the payment cost on the inner Replacement. Preserve it
    // when hoisting that inner reducer; otherwise the reducer is installed as a free reduction
    // and the printed payment (for example, suspending ST20-12) is silently lost.
    const interactiveCost = action.cost ?? nestedCostModifier?.cost;
    const interactiveAdditionalCosts = [
      ...((action.additionalCosts ?? nestedCostModifier?.additionalCosts ?? []) as Cost[]),
      ...((action.additionalCost ?? nestedCostModifier?.additionalCost) !== undefined
        ? [(action.additionalCost ?? nestedCostModifier?.additionalCost) as Cost]
        : []),
    ];
    const interactiveCosts = [
      ...(interactiveCost !== undefined ? [interactiveCost] : []),
      ...interactiveAdditionalCosts,
    ];
    const interactiveOptional =
      action.optional === true || nestedCostModifiers?.some((modifier) => modifier.optional) === true;
    const ownerSeat = ctx.source.ownerSeat;
    ctx.fx.subscribeReplacement({
      ...replacementBudget,
      event,
      sourcePermanentId: self?.permanentId,
      sourceInstanceId: ctx.source.instanceId,
      activationIdentity,
      ...(ctx.activeTiming !== undefined ? { activationTiming: ctx.activeTiming } : {}),
      ...(ctx.activeEffectText !== undefined ? { activationEffectText: ctx.activeEffectText } : {}),
      ...(expiresOnTurnEndOf !== undefined ? { expiresOnTurnEndOf } : {}),
      mode: "reduceCost",
      amount: mode === "increaseCost" ? -(amount ?? 0) : amount,
      ...(scalesIntoColors
        ? { amountForInto: (def: import("@aegis/shared").CardDefinition) => (amount ?? 0) * def.colors.length }
        : {}),
      description: action.raw ?? ctx.activeEffectText ?? nestedCostModifier?.raw ?? "",
      ...(action.consumeOnActivate === true ? { consumeOnActivate: true } : {}),
      digisorptionRedirect: action.digisorptionRedirect,
      // "when this Digimon would digivolve INTO a card with [X] trait/name": restrict the
      // cost reduction to only when the digivolution target satisfies the into-filter.
      intoMatches: intoFilter !== undefined ? (def) => definitionMatches(intoFilter, def) : undefined,
      ...(mode === "increaseCost"
        ? {
            appliesTo: (target: Permanent) => {
              // A Tamer used through a Hybrid "as if level 3 Digimon" path is the Digimon
              // that would digivolve for this reaction (EX3-016 Q3382/Q3383). The action verb
              // has already established that special identity, so do not reject it merely
              // because its printed CardKind is Tamer at this lower cost seam.
              const { kind: _digivolvingKind, ...filter } = action.sourceFilter ?? {};
              return permanentMatchesFilter(ctx, target, filter, ctx.source);
            },
          }
        : mode === "reduceCost" && replacementSourceFilter !== undefined
          ? {
              appliesTo: (target: Permanent) =>
                permanentMatchesFilter(ctx, target, replacementSourceFilter, ctx.source),
            }
          : {}),
      ...(interactiveCosts.length > 0 || interactiveOptional
        ? {
            controllerSeat: ownerSeat,
            ...(self === undefined ? { activationContext: ctx } : {}),
            // "When THIS card would be played" (`isSelfRef`) only ever describes the bearer's own
            // play. Once the bearer is a resident on the field its subscription still exists, so
            // without this identity check every later play by the same seat would be offered the
            // bearer's cost (BT15-102's "place up to 3 [Dark Masters]" prompt on any other card).
            appliesTo: (target: Permanent, originZone?: ZoneRef) =>
              target.controllerSeat === ownerSeat &&
              !target.inBreeding &&
              (target.permanentId.startsWith("pending-play-") && target.topCard !== undefined
                ? (replacementSourceFilter?.isSelfRef !== true ||
                    target.topCard.instanceId === ctx.source.instanceId) &&
                  definitionMatches(replacementSourceFilter ?? {}, ctx.game.definitionOf(target.topCard)) &&
                  (replacementSourceFilter?.zone === undefined ||
                    (originZone !== undefined &&
                      (Array.isArray(replacementSourceFilter.zone)
                        ? replacementSourceFilter.zone.includes(originZone)
                        : replacementSourceFilter.zone === originZone)))
                : permanentMatchesFilter(ctx, target, replacementSourceFilter ?? {}, ctx.source)),
            activate: async (
              runtimeCtx: EffectContext,
              target: Permanent,
              _into: import("@aegis/shared").CardDefinition,
              evolvingInstanceId?: string,
            ) => {
              runtimeCtx.trigger.subjectPermanentId = target.permanentId;
              if (evolvingInstanceId !== undefined) {
                runtimeCtx.reservedCostInstanceIds = new Set([
                  ...(runtimeCtx.reservedCostInstanceIds ?? []),
                  evolvingInstanceId,
                ]);
              }
              if (interactiveCosts.some((cost) => !canPayCost(runtimeCtx, cost))) return false;
              if (
                interactiveCost?.kind === "suspend" &&
                (interactiveCost.target?.isSelf === true || interactiveCost.target?.filter.isSelfRef === true) &&
                self !== undefined &&
                runtimeCtx.fx.canPayActivationCost?.(self.permanentId, "suspend") === false
              )
                return false;
              if (interactiveOptional || action.optional !== false) {
                const accepted = await runtimeCtx.ask.optional(
                  runtimeCtx,
                  action.raw ?? nestedCostModifier?.raw ?? "Pay the cost to reduce the cost?",
                );
                if (!accepted) return false;
              }
              if (nestedCostModifier?.dynamicFrom === "deletedDigimonPlayCost") {
                if (interactiveCost?.kind !== "deleteOwn" || interactiveCost.target === undefined) return false;
                const reductionBinding = `dynamic-play-cost/${ctx.source.instanceId}/${activationIdentity ?? "effect"}`;
                const playCostByPermanentId = new Map(
                  candidatePermanents(runtimeCtx, interactiveCost.target).map((permanent) => [
                    permanent.permanentId,
                    permanent.topCard === undefined
                      ? 0
                      : Math.max(0, runtimeCtx.game.definitionOf(permanent.topCard).playCost),
                  ]),
                );
                const succeeded = await payCost(runtimeCtx, {
                  ...interactiveCost,
                  bindResultAs: reductionBinding,
                });
                if (!succeeded) return false;
                for (const additionalCost of interactiveAdditionalCosts) {
                  if (!(await payCost(runtimeCtx, additionalCost))) return false;
                }
                return [...(runtimeCtx.boundPlayed?.get(reductionBinding) ?? [])].reduce(
                  (total, permanentId) => total + (playCostByPermanentId.get(permanentId) ?? 0),
                  0,
                );
              }
              if (action.amountFromPaidCost === true) {
                if (interactiveCost === undefined) return false;
                const paid = { paidCount: 0 };
                const succeeded = await payCost(runtimeCtx, interactiveCost, paid);
                if (!succeeded) return false;
                for (const additionalCost of interactiveAdditionalCosts) {
                  if (!(await payCost(runtimeCtx, additionalCost))) return false;
                }
                return succeeded ? paid.paidCount : false;
              }
              for (const cost of interactiveCosts) {
                const paid =
                  cost.kind === "suspend" && (cost.target?.isSelf === true || cost.target?.filter.isSelfRef === true)
                    ? self !== undefined && runtimeCtx.fx.payActivationCost?.(self.permanentId, "suspend") === true
                    : await payCost(runtimeCtx, cost);
                if (!paid) return false;
              }
              return true;
            },
            consumeOnActivate: true,
          }
        : {}),
    });
    return;
  }
  // mode === "instead": a substitute side effect the leave-prevention consult runs alongside
  // (not instead of, despite the name — see ReplacementInstallInstead's doc comment) the
  // event; it never itself blocks the removal.
  ctx.fx.subscribeReplacement({
    ...replacementBudget,
    event,
    sourcePermanentId: self?.permanentId,
    sourceInstanceId: ctx.source.instanceId,
    activationIdentity,
    mode: "instead",
    description: action.raw ?? ctx.activeEffectText ?? event,
    digisorptionRedirect: action.digisorptionRedirect,
    causeAllows: (cause, resolvingSeat) => {
      switch (action.leaveCause ?? "any") {
        case "opponentEffect":
        case "byOpponentEffect":
          return cause === "byEffect" && resolvingSeat !== undefined && resolvingSeat !== ctx.source.ownerSeat;
        case "byBattle":
          return cause === "byBattle";
        case "byEffect":
          return cause === "byEffect";
        case "otherThanBattle":
          return cause !== "byBattle";
        case "otherThanYourEffect":
          return !(cause === "byEffect" && resolvingSeat !== undefined && resolvingSeat === ctx.source.ownerSeat);
        case "any":
          return true;
        default:
          return true;
      }
    },
    appliesTo: (_subCtx, leavingPermanentId) => {
      const candidate = _subCtx.game.permanentById(leavingPermanentId);
      if (candidate === undefined) return false;
      const filter = action.sourceFilter ?? action.target?.filter;
      if (filter !== undefined) {
        if (filter.controller === "mine" && candidate.controllerSeat !== ctx.source.ownerSeat) return false;
        if (filter.controller === "opponent" && candidate.controllerSeat === ctx.source.ownerSeat) return false;
        if (!permanentMatchesFilter(_subCtx, candidate, filter, _subCtx.source)) return false;
      }
      if (intoFilter !== undefined) {
        const intoCardId = _subCtx.trigger.digivolvingIntoCardId;
        const into = intoCardId === undefined ? undefined : getCardDefinition(intoCardId);
        if (into === undefined || !definitionMatches(intoFilter, into)) return false;
      }
      return true;
    },
    ...(event === "wouldBePlayed"
      ? {
          appliesToPending: (subCtx: EffectContext, target: import("@aegis/shared").Permanent): boolean => {
            const filter = action.sourceFilter ?? action.target?.filter;
            if (filter === undefined) return true;
            if (filter.controller === "mine" && target.controllerSeat !== subCtx.source.ownerSeat) return false;
            if (filter.controller === "opponent" && target.controllerSeat === subCtx.source.ownerSeat) return false;
            return permanentMatchesFilter(subCtx, target, filter, subCtx.source);
          },
        }
      : {}),
    apply: async (subCtx) => {
      const tracksDigiXrosExpansion = (action.actions ?? []).some(
        (nested) => nested.kind === "DigiXrosMaterialZoneExpansion",
      );
      // A material-zone expansion's "by" payment remains optional even when an older
      // compiled module omits the outer optional flag (BT19-087, CR 15-7-4).
      const hasOptionalDigiXrosCost = (action.actions ?? []).some(
        (nested) => nested.kind === "DigiXrosMaterialZoneExpansion" && nested.cost !== undefined,
      );
      if (
        (action.actions ?? []).some(
          (nested) =>
            nested.kind === "DigiXrosMaterialZoneExpansion" &&
            nested.cost !== undefined &&
            !canPayCost(subCtx, nested.cost),
        )
      )
        return false;
      const expansionCountBefore = tracksDigiXrosExpansion
        ? subCtx.fx.digiXrosPlayExpansionCount?.(subCtx.source.ownerSeat, subCtx.trigger.wouldBePlayedInstanceId)
        : undefined;
      if ((action as { delayArmedIntrinsic?: boolean }).delayArmedIntrinsic === true) {
        const delaySource = subCtx.source.permanent();
        if (delaySource === undefined || delaySource.enterFieldTurnCount === subCtx.game.state.turnCount) return false;
        const dnaDigivolveActions = (action.actions ?? []).filter(
          (candidate): candidate is Extract<Action, { kind: "DnaDigivolve" }> => candidate.kind === "DnaDigivolve",
        );
        if (
          dnaDigivolveActions.length > 0 &&
          !dnaDigivolveActions.some((candidate) => canAttemptDnaDigivolve(subCtx, candidate))
        )
          return false;
        if (!(await subCtx.ask.optional(subCtx, action.raw ?? "Trash this card to activate its ＜Delay＞ effect?"))) {
          return false;
        }
        const trashed = await subCtx.fx.deletePermanent([delaySource.permanentId]);
        if (trashed <= 0 && subCtx.source.permanent() !== undefined) return false;
      } else if (
        (action.optional === true || hasOptionalDigiXrosCost) &&
        !(await subCtx.ask.optional(subCtx, action.raw ?? "Use this effect?"))
      ) {
        return false;
      }
      for (const a of action.actions ?? []) {
        const abort = await runAction(subCtx, a);
        if (abort) break;
      }
      if (tracksDigiXrosExpansion && expansionCountBefore !== undefined) {
        return (
          (subCtx.fx.digiXrosPlayExpansionCount?.(subCtx.source.ownerSeat, subCtx.trigger.wouldBePlayedInstanceId) ??
            expansionCountBefore) > expansionCountBefore
        );
      }
      return true;
    },
  });
}

export async function runPrevent(ctx: EffectContext, action: Extract<Action, { kind: "Prevent" }>): Promise<void> {
  const event = action.mode === "delete" ? "wouldBeDeleted" : "wouldLeavePlay";
  await runReplacement(ctx, {
    ...action,
    kind: "Replacement",
    event,
    mode: "prevent",
    raw: action.raw ?? "legacy Prevent",
  });
}
