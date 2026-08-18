// The per-kind dispatch for every IR action.

import type { EffectContext } from "../../EffectContext.js";
import { evaluateCondition } from "../conditions.js";
import { canPayCost, payCost, payOneCostOption } from "../costs.js";
import { describeAction } from "../describe.js";
import { type ActionScope, installActionRunner } from "../dispatch.js";
import { unsupported } from "../errors.js";
import { scaleFactor } from "../scaling.js";
import { DEFAULT_PLAY_ZONES, candidateLooseInstances } from "../targeting/loose.js";
import { runBoardAction } from "./board.js";
import { runCombatAction } from "./combat.js";
import { runControlFlowAction } from "./controlFlow.js";
import { runDigivolutionAction } from "./digivolution.js";
import { canAttemptDigivolve } from "./digivolve.js";
import { runGrantStaticAction } from "./grantStatic.js";
import { runMetaAction } from "./meta.js";
import { canAttemptPlaceUnder } from "./placeUnder.js";
import { runPlayAction } from "./play.js";
import { runRemovalAction } from "./removal.js";
import { runResourceAction } from "./resources.js";
import { runRestrictionAction } from "./restrictions.js";
import { runRevealAction } from "./reveal.js";
import { runSecurityAction } from "./security.js";
import { runStaticAction } from "./statics.js";
import type { Action, Cost, ZoneRef } from "@aegis/shared";

// ---------------------------------------------------------------------------
// Action dispatch
// ---------------------------------------------------------------------------

/**
 * Run a single Action against the live context.
 * Returns `true` when the action was an optional that was declined AND
 * `abortOnDecline` is set — the caller should stop processing further actions.
 */
export async function runAction(ctx: EffectContext, action: Action): Promise<boolean> {
  // Per-action gate.
  if (action.kind !== "RawUnparsed" && action.kind !== "ConditionalBranch" && action.condition) {
    if (!evaluateCondition(ctx, action.condition)) return false;
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
    action.optional
  ) {
    // An optional hatch is meaningful only when it can move the top Digi-Egg into
    // an empty breeding slot. Do this before opening the confirmation so the UI
    // never offers an action that the Hatch primitive would immediately no-op.
    if (action.kind === "Hatch") {
      const owner = ctx.game.player(ctx.source.ownerSeat);
      if (owner.breeding !== undefined || owner.eggDeck.length === 0) return false;
    }
    // Do not offer an optional play when no legal loose card exists. Besides avoiding a
    // meaningless UI prompt, this is required for nested entry windows: Nokia played from
    // security must finish resolving when the controller has no Agumon/Gabumon to play.
    if (
      action.kind === "PlayWithoutCost" &&
      !action.target?.isSelf &&
      action.target?.filter?.isSelfRef !== true &&
      action.fromOwnDigivolutionStack !== true
    ) {
      const zones = action.from && action.from.length > 0 ? action.from : DEFAULT_PLAY_ZONES;
      const candidates = candidateLooseInstances(ctx, action.target, zones).filter(
        (candidate) => !ctx.fx.isPlayProhibited?.(ctx.source.ownerSeat, candidate.cardId, "play"),
      );
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
    if (action.kind === "Return" && !action.target.isSelf && action.target.filter.isSelfRef !== true) {
      const zone = action.target.filter.zone;
      const looseZones = action.from ?? (zone !== undefined && zone !== "battleArea" ? [zone] : undefined);
      // Only preflight loose-zone recovery here. A battle-area Return may have an
      // activation cost that changes target legality (BT16-048 suspends the Digimon
      // whose DP becomes the bounce ceiling), so its candidates must be resolved
      // after payment by the normal action path.
      if (looseZones !== undefined && candidateLooseInstances(ctx, action.target, looseZones).length === 0)
        return false;
    }
    // A "may digivolve" prompt is meaningful only when at least one matching source and
    // destination form a legal digivolution. In particular, "without paying the cost" does
    // not waive printed requirements (P-092 Q4182); do this before asking so the UI never
    // confirms an evolution the resolver will immediately discard.
    if (action.kind === "Digivolve" && !canAttemptDigivolve(ctx, action)) return false;
    const costUnpayable = action.cost !== undefined && !canPayCost(ctx, action.cost as Cost);
    if (!costUnpayable) {
      const yes = await ctx.ask.optional(ctx, describeAction(action));
      if (!yes) {
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
    action.kind !== "PlayPerLevel" &&
    (action.costOptions?.length ?? 0) > 0
  ) {
    const paid = await payOneCostOption(ctx, action.costOptions as Cost[]);
    if (!paid) return action.abortOnDecline === true;
  } else if (
    action.kind !== "RawUnparsed" &&
    action.kind !== "Replacement" &&
    action.kind !== "CostModifier" &&
    action.kind !== "SubTrigger" &&
    action.kind !== "PlayPerLevel" &&
    action.cost
  ) {
    if (action.cost.optional) {
      const willPay = await ctx.ask.optional(ctx, `Pay cost: ${action.cost.raw ?? action.cost.kind}?`);
      if (willPay) await payCost(ctx, action.cost, costPayment);
    } else {
      const deferSuspendTriggers = action.kind === "Attack" && action.cost.kind === "suspend";
      const paid = await payCost(ctx, action.cost, costPayment, { deferSuspendTriggers });
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
          action.cost.kind === "trash" &&
          action.cost.target?.filter.zone === "digivolutionCards" &&
          action.cost.target.filter.isSelfRef === true;
        const isSecurityTrashCost = action.cost.kind === "trash" && action.cost.target?.filter.zone === "security";
        return action.abortOnDecline === true || isDigiBurstCost || isSecurityTrashCost;
      }
    }
  }
  if (
    action.kind !== "RawUnparsed" &&
    action.kind !== "Replacement" &&
    action.kind !== "CostModifier" &&
    action.kind !== "SubTrigger" &&
    action.kind !== "PlayPerLevel"
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
    action.kind !== "RawUnparsed" && action.cost?.kind === "trash" && action.cost.target?.upTo === true
      ? costPayment.paidCount
      : undefined;
  // The upTo-Digi-Burst paid count and a `scaling` ("for each") hint are two
  // independent multipliers; the current catalog never carries both (BT7-040 is the
  // only upTo-Digi-Burst and has no scaling). Silently letting the paid count win
  // would drop a real scaling factor and produce a wrong multiplier — surface it
  // loudly instead of guessing how to combine them.
  if (digiBurstScale !== undefined && action.kind !== "RawUnparsed" && action.scaling) {
    unsupported(ctx, action, "upTo Digi-Burst cost combined with a scaling hint is ambiguous");
  }
  // Scaling ("for each/every"): compute the multiplier from live state and apply it
  // to the amount (Draw/GainMemory/ModifyDP/ModifySecurityDP) or the target count
  // (Delete/Trash/Return/... ). A factor of 0 means the action does nothing.
  // A `usePaidCount` scaling reads the count of cards actually paid by THIS action's cost
  // ("for every Tamer this effect suspended", BT17-041) rather than re-counting the board.
  const paidCountScale =
    action.kind !== "RawUnparsed" && action.scaling?.usePaidCount === true
      ? Math.floor(costPayment.paidCount / (action.scaling.per > 0 ? action.scaling.per : 1))
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
  const isDeleteLevelCeilingScaling = action.kind === "Delete" && action.scaling?.levelCeilingAdd !== undefined;
  if (scale !== undefined && scale === 0 && !isSetCostModifier && !isDeleteLevelCeilingScaling) return false;

  // Everything the prologue worked out that a case body still needs.
  const scope: ActionScope = { scale, deferredCostSuspensions };

  switch (action.kind) {
    case "Draw":
    case "GainMemory":
    case "SetMemory":
    case "SetTurnEndMemory":
    case "TrashTopDeck":
    case "ReducePlayCost":
    case "CostModifier":
      return await runResourceAction(ctx, action, scope);
    case "Delete":
    case "DeleteUntilCount":
    case "DeleteBudget":
    case "DeleteLevelBudget":
    case "DeleteByDPBudget":
    case "AddToDPDeleteBudget":
    case "Trash":
    case "Return":
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
      return await runRestrictionAction(ctx, action);
    case "Aura":
    case "GrantAuraToOpponents":
    case "WaiveColorRequirement":
      return await runStaticAction(ctx, action);
    case "GrantStatic":
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
    case "Modal":
    case "ConditionalBranch":
    case "DelayedEffect":
    case "SubTrigger":
    case "Replacement":
    case "Prevent":
    case "GainTriggeredEffect":
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
    case "trashSecurityTop":
    case "ModifySecurityDP":
    case "SecurityAttackInvert":
    case "DisableSecurityEffect":
      return await runSecurityAction(ctx, action, scope);
    case "Search":
    case "SearchSecurity":
    case "Reveal":
    case "RevealAdd":
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
