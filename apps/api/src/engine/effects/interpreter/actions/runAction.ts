// The per-kind dispatch for every IR action.

import { requireOpponentAsk } from "../../../decisions/decisionApi.js";
import type { EffectContext, Restriction } from "../../EffectContext.js";
import { runtimeCompiledCard } from "../compiledCards.js";
import { evaluateCondition } from "../conditions.js";
import { canPayCost, payCost, payOneCostOption } from "../costs.js";
import { describeAction } from "../describe.js";
import { installActionRunner, runEffect } from "../dispatch.js";
import { toDuration } from "../duration.js";
import { ACTION_TYPE_KEYWORDS, unsupported } from "../errors.js";
import { GRANTED_EFFECT_LIBRARY } from "../grantedEffects.js";
import { COLOR_MAP, PROTECTION_STRING_TOKEN_MAP, PROTECTION_TOKEN_MAP } from "../maps.js";
import { DefinitionFacts, definitionMatches, parseCopyEffectsFilterText } from "../matching/definition.js";
import { permanentMatchesFilter, seatsForController } from "../matching/permanent.js";
import { countMatching, scaleFactor } from "../scaling.js";
import { DEFAULT_PLAY_ZONES, candidateLooseInstances, looseCardsInZone, pickLoose } from "../targeting/loose.js";
import {
  candidatePermanents,
  raiseDeletionDpCap,
  resolveExceptSurvivors,
  resolvePermanentTargets,
  resolveTotalDpCapTargets,
  topInstanceIds,
} from "../targeting/permanents.js";
import { runActivateEffect, runActivateForeignEffect, runActivateMain, runUseOptionWithoutCost } from "./borrowed.js";
import { canAttemptDigivolve, runDigivolve } from "./digivolve.js";
import { runAppFuse, runDnaDigivolve, runPlayPerLevel } from "./dna.js";
import { runLink, runMindLink } from "./link.js";
import { runModal } from "./modal.js";
import { canAttemptPlaceUnder, runPlaceUnder, runTrashDigivolution } from "./placeUnder.js";
import { runPrevent, runReplacement } from "./replacement.js";
import { runReveal, runRevealAdd, runRevealChooseDeleteBudget } from "./reveal.js";
import { runRecoverByTrashingMostSecurity, runSecurityManipulation } from "./security.js";
import { SUBTRIGGER_EVENT_MAP, runGainTriggeredEffect, runSubTrigger } from "./subTrigger.js";
import { CardColor, CardKind, EffectDuration, getCardDefinition, isTamer } from "@aegis/shared";
import type { Action, CardDefinition, Cost, Permanent, Seat, Target, ZoneRef } from "@aegis/shared";

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

  switch (action.kind) {
    case "Draw": {
      const seat = action.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
      const drawn = await ctx.fx.draw(seat, scale === undefined ? action.amount : action.amount * scale);
      // Bind "If you do" to an ACTUAL draw. Drawing from an empty deck does not satisfy the
      // clause (ST10-01), while one or more cards drawn does and enables the following action.
      ctx.lastEffectActed = drawn.length > 0;
      return false;
    }
    case "GainMemory": {
      const amount = scale === undefined ? action.amount : action.amount * scale;
      ctx.lastMemoryGainAmount = amount;
      const seat = ctx.source.ownerSeat;
      if (action.at === "endOfTurn") {
        // Deferred one-shot ("at the end of your turn, lose 3 memory" — BT1-021). Installed
        // anchor-less so it still fires if this source is deleted first (KB Q882/Q883).
        ctx.fx.delayedGainMemory?.(seat, amount);
        return false;
      }
      ctx.fx.gainMemoryForSeat(seat, amount, { isTamerEffect: isTamer(ctx.source.definition) });
      return false;
    }
    case "SetMemory":
      ctx.fx.setMemory(action.value);
      return false;
    case "SetTurnEndMemory":
      ctx.fx.setTurnEndMinMemory?.(ctx.source.ownerSeat, action.minimum);
      return false;
    case "TrashTopDeck": {
      // No dedicated "mill" primitive; reveal then trash the revealed top N.
      const seats: Seat[] =
        action.controller === "both"
          ? [ctx.source.ownerSeat, ctx.game.opponentOf(ctx.source.ownerSeat)]
          : action.controller === "opponent"
            ? [ctx.game.opponentOf(ctx.source.ownerSeat)]
            : [ctx.source.ownerSeat];
      let totalTrashed = 0;
      const maximum = action.amount * (scale ?? 1);
      const minimum = Math.min(action.minimum ?? maximum, maximum);
      const amount =
        action.upTo === true && minimum < maximum
          ? minimum +
            (await ctx.ask.chooseOption(
              ctx,
              Array.from(
                { length: maximum - minimum + 1 },
                (_, index) => `Trash ${minimum + index} card${minimum + index === 1 ? "" : "s"}`,
              ),
            ))
          : maximum;
      for (const seat of seats) {
        const revealed = await ctx.fx.reveal(seat, amount);
        if (revealed.length > 0) {
          const ids = revealed.map((c) => c.instanceId);
          await ctx.fx.trash(ids, { byEffectSeat: ctx.source.ownerSeat });
          totalTrashed += ids.length;
          await ctx.fx.fireOnDiscardLibrary(seat, ids);
          // Fire whenTrashedFromDeck once per trashed card so a card-specific watcher
          // (BT19-097 "when THIS card is trashed from the deck") can match by card ID.
          for (const card of revealed) {
            await ctx.fx.fireWhenTrashedFromDeck(card.cardId, card.instanceId, ctx.source.cardId);
          }
        }
      }
      if (action.trackCount !== undefined) {
        ctx.namedCounts ??= new Map();
        ctx.namedCounts.set(action.trackCount, totalTrashed);
      }
      return false;
    }
    case "Delete": {
      const survivorIds = await resolveExceptSurvivors(ctx, action.target);
      let target = action.target;
      if (action.dpCeilingScaling && target.filter.dp?.value !== undefined) {
        target = {
          ...target,
          filter: {
            ...target.filter,
            dp: {
              ...target.filter.dp,
              value:
                target.filter.dp.value + scaleFactor(ctx, action.dpCeilingScaling) * action.dpCeilingScaling.amount,
            },
          },
        };
      }
      target = raiseDeletionDpCap(ctx, target);
      if (action.playCostCeiling !== undefined) {
        const ceiling = action.playCostCeiling;
        const units = scaleFactor(ctx, ceiling);
        target = {
          ...target,
          filter: {
            ...target.filter,
            playCostLte: ceiling.base + units * ceiling.raise,
          },
        };
      }
      if (scale !== undefined && action.scaling?.levelCeilingAdd === undefined && typeof target.count === "number") {
        target = { ...target, count: target.count * scale };
      }
      if (
        scale !== undefined &&
        action.scaling?.levelCeilingAdd !== undefined &&
        target.filter.levelComparison?.value !== undefined
      ) {
        target = {
          ...target,
          filter: {
            ...target.filter,
            levelComparison: {
              ...target.filter.levelComparison,
              value: target.filter.levelComparison.value + scale * action.scaling.levelCeilingAdd,
            },
          },
        };
      }
      const resolved =
        target.totalDpCap !== undefined
          ? await resolveTotalDpCapTargets(ctx, target)
          : await resolvePermanentTargets(ctx, target);
      const ids = survivorIds.length > 0 ? resolved.filter((id) => !survivorIds.includes(id)) : resolved;
      if (action.at === "endOfTurn") {
        for (const id of ids) ctx.fx.delayedDeletePlayed?.(id);
        ctx.lastDeleteCount = 0;
        return false;
      }
      // Bind the delete OUTCOME on ctx (effect-result binding): the count actually removed, read
      // by a subsequent "if this effect didn't delete" Condition (KB BT23-069 Q5338). A resolve
      // that chose 0 targets (none eligible) is also "didn't delete" => bind 0.
      ctx.lastDeleteCount = ids.length > 0 ? await ctx.fx.deletePermanent(ids) : 0;
      ctx.lastDeletedByThisEffectIds = ids.filter((id) => ctx.game.permanentById(id) === undefined);
      ctx.deletedThisEffectIds = [
        ...(ctx.deletedThisEffectIds ?? []),
        ...ctx.lastDeletedByThisEffectIds.filter((id) => !(ctx.deletedThisEffectIds ?? []).includes(id)),
      ];
      ctx.lastEffectActed = ctx.lastDeletedByThisEffectIds.length > 0;
      return false;
    }
    case "DeleteUntilCount": {
      // BT19-094 Lucemon: delete opponent Digimon until their remaining Digimon count equals
      // the number of your security cards. If they already have that many or fewer, nothing is
      // deleted. Selection is interactive among the eligible target pool.
      const desiredCount =
        action.untilCountSource === "mineSecurityCount" ? ctx.game.player(ctx.source.ownerSeat).security.length : 0;
      const candidates = candidatePermanents(ctx, { ...action.target, count: "all" });
      const toDelete = Math.max(0, candidates.length - desiredCount);
      if (toDelete === 0) {
        ctx.lastDeleteCount = 0;
        ctx.lastDeletedByThisEffectIds = [];
        ctx.lastEffectActed = false;
        if (action.trackCount !== undefined) {
          if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
          ctx.namedCounts.set(action.trackCount, 0);
        }
        return false;
      }
      const target: Target = { ...action.target, count: toDelete };
      const selected = await resolvePermanentTargets(ctx, target);
      const deleted = selected.length > 0 ? await ctx.fx.deletePermanent(selected) : 0;
      const actuallyDeleted = deleted > 0 ? selected.filter((id) => ctx.game.permanentById(id) === undefined) : [];
      ctx.lastDeleteCount = deleted;
      ctx.lastDeletedByThisEffectIds = actuallyDeleted;
      ctx.lastEffectActed = deleted > 0;
      if (action.trackCount !== undefined) {
        if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
        ctx.namedCounts.set(action.trackCount, deleted);
      }
      return false;
    }
    case "DeleteBudget": {
      // P-094 Destromon: select opponent permanents up to a total play-cost budget.
      // Resolve candidate permanents, sort ascending by printed play cost, iterate
      // accumulating cost until budget is exhausted.
      // BT19-096: optional scaling.budgetAdd increases the effective budget based on
      // a counted pool (e.g. face-up security cards). effectiveBudget = budget + units * budgetAdd.
      let effectiveBudget = action.budget;
      if (action.scaling !== undefined && action.scaling.budgetAdd !== undefined) {
        const units = scaleFactor(ctx, action.scaling);
        effectiveBudget += units * action.scaling.budgetAdd;
      }
      const candidates = candidatePermanents(ctx, {
        filter: action.filter,
        count: "all",
      } as Target);
      if (candidates.length === 0) {
        ctx.lastDeleteCount = 0;
        return false;
      }
      // Sort ascending by printed play cost
      const byCost = candidates
        .map((p) => {
          const cost = p.topCard !== undefined ? (ctx.game.definitionOf(p.topCard).playCost ?? 0) : 0;
          return { permanentId: p.permanentId, cost };
        })
        .sort((a, b) => a.cost - b.cost);
      // Sequential selection: prompt controller for each cheapest candidate
      const selected: string[] = [];
      let spent = 0;
      for (const candidate of byCost) {
        // upTo: the controller may decline individual picks
        if (action.upTo && spent + candidate.cost > effectiveBudget) continue;
        if (spent + candidate.cost > effectiveBudget) break; // cannot afford this one
        const yes = action.upTo
          ? await ctx.ask.optional(
              ctx,
              `Delete ${candidate.permanentId} (cost ${candidate.cost}, spent ${spent}/${effectiveBudget})?`,
            )
          : true;
        if (yes) {
          selected.push(candidate.permanentId);
          spent += candidate.cost;
        }
        if (spent >= effectiveBudget && !action.upTo) break;
      }
      ctx.lastDeleteCount = selected.length > 0 ? await ctx.fx.deletePermanent(selected) : 0;
      return false;
    }
    case "DeleteLevelBudget": {
      // BT17-051 Argomon: delete any number of opponent Digimon whose LEVELS sum to <= budget.
      // The budget is `baseBudget` plus a scaling-driven add ("for every 2 [Argomon] in its
      // digivolution cards, +1 to the maximum"): scaleFactor() yields the floor(count/per) units,
      // each worth `scaling.budgetAdd`. `filter.hasLevel` excludes Lv.- candidates (KB Q2807).
      let budget = action.baseBudget;
      if (action.scaling) {
        const units = scaleFactor(ctx, action.scaling);
        budget += units * (action.scaling.budgetAdd ?? 1);
      }
      const candidates = candidatePermanents(ctx, { filter: action.filter, count: "all" } as Target);
      const byLevel = candidates
        .map((p) => ({
          permanentId: p.permanentId,
          level: p.topCard !== undefined ? (ctx.game.definitionOf(p.topCard).level ?? 0) : 0,
        }))
        .filter((c) => c.level > 0)
        .sort((a, b) => a.level - b.level);
      const selected: string[] = [];
      let spent = 0;
      for (const candidate of byLevel) {
        if (spent + candidate.level > budget) {
          if (action.upTo) continue;
          break;
        }
        const yes = action.upTo
          ? await ctx.ask.optional(
              ctx,
              `Delete ${candidate.permanentId} (level ${candidate.level}, spent ${spent}/${budget})?`,
            )
          : true;
        if (yes) {
          selected.push(candidate.permanentId);
          spent += candidate.level;
        }
      }
      ctx.lastDeleteCount = selected.length > 0 ? await ctx.fx.deletePermanent(selected) : 0;
      return false;
    }
    case "DeleteByDPBudget": {
      // BT19-011: select any combination of opponent Digimon whose DP values sum to <= budget.
      // Generic "add N to the maximum DP you can choose with DP-based deletion effects"
      // modifiers also raise aggregate budgets (BT9-009/011 feeding BT9-014), in addition
      // to the dedicated AddToDPDeleteBudget producer used by later cards.
      const sourcePerm = ctx.source.permanent();
      const dedicatedBudgetBonus =
        sourcePerm !== undefined ? (ctx.fx.dpDeleteBudgetBonus?.(sourcePerm.permanentId) ?? 0) : 0;
      const genericDeletionMaxBonus = ctx.fx.deletionMaxDpBonus?.(ctx.source.ownerSeat, sourcePerm?.permanentId) ?? 0;
      const scaledBonus = action.budgetBonus
        ? action.budgetBonus.per *
          Math.floor(
            (action.budgetBonus.unit === "selfDigivolutionCards"
              ? (sourcePerm?.stack.length ?? 0)
              : countMatching(ctx, action.budgetBonus.filter ?? {})) / (action.budgetBonus.perCount ?? 1),
          )
        : 0;
      const effectiveBudget = action.baseBudget + dedicatedBudgetBonus + genericDeletionMaxBonus + scaledBonus;
      const candidates = candidatePermanents(ctx, { filter: action.target.filter, count: "all" } as Target);
      if (candidates.length === 0) {
        ctx.lastDeleteCount = 0;
        ctx.lastDeletedByThisEffectIds = [];
        return false;
      }
      // Sort ascending by live DP so the greedy pass picks cheapest first.
      const byDP = candidates.map((p) => ({ permanentId: p.permanentId, dp: p.currentDP })).sort((a, b) => a.dp - b.dp);
      const selected: string[] = [];
      let spent = 0;
      for (const candidate of byDP) {
        if (spent + candidate.dp > effectiveBudget) continue; // skip; another may still fit
        const yes = await ctx.ask.optional(
          ctx,
          `Delete ${candidate.permanentId} (DP ${candidate.dp}, spent ${spent}/${effectiveBudget})?`,
        );
        if (yes) {
          selected.push(candidate.permanentId);
          spent += candidate.dp;
        }
      }
      const deleted = selected.length > 0 ? await ctx.fx.deletePermanent(selected) : 0;
      ctx.lastDeleteCount = deleted;
      // `selected` is the ATTEMPTED set; deletePermanent silently no-ops entries a
      // reaction (Evade/Barrier/leave-prevention) survived, so it does not equal what
      // was actually removed. `scaleFactor`'s `deletedByThisEffect` branch scales by
      // this list (KB CAP-A3 "for each deleted this way"), so it must be the ACTUAL
      // survivors only (engine-audit finding 7) — derive it by checking which
      // permanentIds are gone from the board post-delete, the same signal deletePermanent
      // itself uses internally (there is no id-level return from the primitive, only a count).
      ctx.lastDeletedByThisEffectIds =
        deleted > 0 ? selected.filter((id) => ctx.game.permanentById(id) === undefined) : [];
      return false;
    }
    case "AddToDPDeleteBudget": {
      // Inherited [All Turns] modifier (BT19-011): stack a DP-deletion-budget bonus on the
      // source permanent so any subsequent DeleteByDPBudget in the same resolution adds it.
      const perm = ctx.source.permanent();
      if (perm !== undefined) {
        ctx.fx.addDpDeleteBudget?.(perm.permanentId, action.amount);
      }
      return false;
    }
    case "ReducePlayCost": {
      // Pay-time interactive cost reduction (EX9-043 / BT25-076), resolved SERVER-SIDE inside the
      // in-hand card's BeforePayCost window. The payment is OPTIONAL: offer it,
      // execute it in the engine, then bind the earned delta on ctx.playCostDelta (accumulated, so
      // multiple BeforePayCost effects on one card compose). The client never supplies the delta —
      // it is computed from what the engine actually trashed/deleted (T-08-26).
      const payment = action.payment;
      if (!payment) return false;
      if (payment.kind === "trashFromHand") {
        // "By trashing 1 [Cyborg]/[Ver.5] card from your hand" — an optional hand discard. The card
        // being played is itself still in hand at this BeforePayCost window; exclude it so it cannot
        // be its own trash payment (it carries the [Cyborg]/[Ver.5] trait too).
        const trashTarget: Target = { filter: { ...payment.filter, zone: "hand" }, count: 1, upTo: true };
        const candidates = candidateLooseInstances(ctx, trashTarget, ["hand"]).filter(
          (c) => c.instanceId !== ctx.source.instanceId,
        );
        if (candidates.length === 0) return false;
        if (!(await ctx.ask.optional(ctx, "Trash 1 card to reduce the play cost"))) return false;
        const chosen = await pickLoose(ctx, trashTarget, candidates);
        if (chosen.length === 0) return false;
        await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
        const delta = action.amount.kind === "fixed" ? action.amount.value : 0;
        ctx.playCostDelta = (ctx.playCostDelta ?? 0) + Math.max(0, delta);
        return false;
      }
      // sacrificePermanent: "By deleting 1 of your play-cost-≤11 [Negamon] Digimon" (BT25-076).
      // Capture the chosen permanent's PRINTED play cost BEFORE deleting it, so the dynamic delta
      // equals the sacrificed Digimon's cost.
      const sacTarget = payment.target;
      const sacCandidates = await resolvePermanentTargets(ctx, { ...sacTarget, upTo: true });
      if (sacCandidates.length === 0) return false;
      if (!(await ctx.ask.optional(ctx, "Delete 1 of your Digimon to reduce the play cost"))) return false;
      const chosenIds = await ctx.ask.chooseTargets(ctx, { candidates: sacCandidates, min: 1, max: 1 });
      if (chosenIds.length === 0) return false;
      const sacrificed = ctx.game.permanentById(chosenIds[0]!);
      const sacrificedCost =
        sacrificed?.topCard !== undefined ? ctx.game.definitionOf(sacrificed.topCard).playCost : undefined;
      const removed = await ctx.fx.deletePermanent(chosenIds);
      // Only earn the reduction if the sacrifice ACTUALLY happened (a prevented/immune target
      // gate). The dynamic delta is the deleted card's printed play cost (floored, -1 sentinel => 0).
      if (removed > 0 && sacrificedCost !== undefined) {
        const delta =
          action.amount.kind === "deletedSacrificePlayCost"
            ? Math.max(0, sacrificedCost)
            : Math.max(0, action.amount.value);
        ctx.playCostDelta = (ctx.playCostDelta ?? 0) + delta;
      }
      return false;
    }
    case "OpponentMayTrashSecurity": {
      const opponent = ctx.game.opponentOf(ctx.source.ownerSeat);
      const ask = requireOpponentAsk(ctx);
      const accepted = await ask.optional(ctx, "Trash the top card of your security stack?");
      ctx.lastOpponentDeclined = !accepted;
      if (accepted && ctx.game.player(opponent).security.length > 0) {
        await ctx.fx.trashFromSecurity(opponent, 1, { fromTop: true });
      }
      return false;
    }
    case "Trash": {
      // A hand-zone target is a discard ("trash N card(s) in your/their hand"): resolve
      // loose hand cards and trash the chosen ones. Otherwise it is a field trash (the
      // resolved permanents' top cards).
      if (action.target.filter.zone === "hand") {
        // "your opponent trashes 1 card in their hand" sets chooser: "opponent" — the OWNER
        // of the hand picks their own discard, routed through requireOpponentAsk rather than
        // the controller's ctx.ask (see TrashAction.chooser doc comment). Default/absent
        // (the controller reaching into a hand, e.g. "trash 1 of your opponent's cards in
        // their hand") is unchanged.
        const asker = action.chooser === "opponent" ? requireOpponentAsk(ctx) : ctx.ask;
        let chosen: string[];
        if (action.target.untilHandSize !== undefined) {
          // "Trash cards from your hand until you have untilHandSize left" (BT20-077).
          // Compute how many must leave; player selects them. (CAP-E12)
          const handSeat = seatsForController(ctx, action.target.filter)[0] ?? ctx.source.ownerSeat;
          const handSize = ctx.game.player(handSeat).hand.length;
          const toTrash = Math.max(0, handSize - action.target.untilHandSize);
          if (toTrash === 0) {
            chosen = [];
          } else {
            const untilCandidates = candidateLooseInstances(ctx, { ...action.target, count: toTrash }, ["hand"]);
            chosen = await pickLoose(ctx, { ...action.target, count: toTrash }, untilCandidates, undefined, asker);
          }
        } else {
          const candidates = candidateLooseInstances(ctx, action.target, ["hand"]);
          chosen = await pickLoose(ctx, action.target, candidates, undefined, asker);
        }
        if (chosen.length > 0) await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
        // Bind the branch-acted result so an "if you did" tail (BT16-094 OR-modal) can gate.
        ctx.lastEffectActed = chosen.length > 0;
        // Store actual trash count under the named key for downstream scaling. (CAP-E12/E13)
        if (action.trackCount !== undefined) {
          if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
          ctx.namedCounts.set(action.trackCount, chosen.length);
        }
        if (action.bindResultAs !== undefined) {
          if (ctx.boundPlayed === undefined) ctx.boundPlayed = new Map();
          ctx.boundPlayed.set(action.bindResultAs, new Set(chosen));
        }
        return false;
      }
      // Security-zone trash ("trash the top security card", BT20-080 onDeletion body).
      // Security cards are loose card instances, not battle-area permanents, so
      // resolvePermanentTargets would find nothing. Route through trashFromSecurity instead.
      if (action.target.filter.zone === "security") {
        const seat =
          action.target.filter.controller === "opponent"
            ? ctx.game.opponentOf(ctx.source.ownerSeat)
            : ctx.source.ownerSeat;
        const n = action.target.count === "all" ? ctx.game.player(seat).security.length : action.target.count;
        if (n <= 0 || ctx.game.player(seat).security.length < n) return false;
        const isBottom = action.target.filter.position === "bottom";
        await ctx.fx.trashFromSecurity(seat, n, { fromTop: !isBottom });
        return false;
      }
      if (action.target.filter.zone === "deck") {
        const seat =
          action.target.filter.controller === "opponent"
            ? ctx.game.opponentOf(ctx.source.ownerSeat)
            : ctx.source.ownerSeat;
        const deck = ctx.game.player(seat).deck;
        const n = action.target.count === "all" ? deck.length : action.target.count;
        const topCards = deck.slice(0, n);
        const topIds = topCards.map((card) => card.instanceId);
        if (topIds.length > 0) {
          await ctx.fx.trash(topIds, { byEffectSeat: ctx.source.ownerSeat });
          await ctx.fx.fireOnDiscardLibrary(seat, topIds);
          for (const card of topCards) {
            await ctx.fx.fireWhenTrashedFromDeck(card.cardId, card.instanceId, ctx.source.cardId);
          }
        }
        ctx.lastEffectActed = topIds.length > 0;
        return false;
      }
      if (action.target.filter.zone === "digivolutionCards") {
        const candidates = candidateLooseInstances(ctx, action.target, ["digivolutionCards"]);
        const chosen = await pickLoose(ctx, action.target, candidates);
        if (chosen.length > 0) await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
        ctx.lastEffectActed = chosen.length > 0;
        return false;
      }
      const permanentIds = await resolvePermanentTargets(ctx, action.target);
      if (action.returnDigivolutionCardsFirst) {
        for (const permanentId of permanentIds) {
          const permanent = ctx.game.permanentById(permanentId);
          const stackIds = permanent?.stack.map((card) => card.instanceId) ?? [];
          if (stackIds.length > 0) await ctx.fx.returnToDeck(stackIds, { toTop: false });
        }
      }
      // `topCardOnly`: "trash the TOP CARD of 1 of your Digimon" (BT8-110). The `trash` verb
      // below moves loose cards, and a permanent's top card is not loose — it would be skipped
      // in silence. `armorPurge` is the move this wording describes: the top card goes to
      // trash and the digivolution card beneath is promoted (CR §16-19-1). With nothing
      // beneath to promote there is no card left for the permanent to be, so it is deleted.
      if (action.target.topCardOnly === true) {
        for (const permanentId of permanentIds) {
          const permanent = ctx.game.permanentById(permanentId);
          if (permanent === undefined) continue;
          if (permanent.stack.length > 0) await ctx.fx.armorPurge?.(permanentId);
          else await ctx.fx.deletePermanent([permanentId]);
        }
        return false;
      }
      const ids = topInstanceIds(ctx, permanentIds);
      if (ids.length > 0) await ctx.fx.trash(ids, { byEffectSeat: ctx.source.ownerSeat });
      return false;
    }
    case "HandManipulation": {
      const count = action.amount === "variable" ? (ctx.trigger.addedToHand?.instanceIds.length ?? 0) : action.amount;
      if (count <= 0) return false;
      const controller = action.controller ?? "mine";
      const target: Target = {
        filter: { zone: "hand", controller },
        count,
        upTo: true,
      };
      const candidates = candidateLooseInstances(ctx, target, ["hand"]);
      // See TrashAction.chooser: "your opponent trashes cards in their hand equal to..."
      // (BT10-077) is the opponent's own discard, not the controller reaching into it.
      const asker = action.chooser === "opponent" ? requireOpponentAsk(ctx) : ctx.ask;
      const chosen = await pickLoose(ctx, target, candidates, undefined, asker);
      if (chosen.length > 0) await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat });
      return false;
    }
    case "Return": {
      // Security effects such as BT10-109 encode "add this card to its owner's hand"
      // as Return(isSelfRef). The source is a loose security card, so it has no
      // permanent for resolvePermanentTargets to find.
      if (action.target.isSelf || action.target.filter.isSelfRef) {
        if (action.to === "hand") await ctx.fx.returnToHand([ctx.source.instanceId]);
        else await ctx.fx.returnToDeck([ctx.source.instanceId], { toTop: action.to === "deckTop" });
        return false;
      }
      // A non-battle-area zone target ("return 1 [X] from your trash/hand/security/... to
      // your hand", BT1-011) sources a LOOSE card instance, not a battle-area permanent —
      // resolvePermanentTargets only scans battleArea and would always find zero candidates,
      // silently no-opping the whole effect. Route through the same loose-instance resolution
      // the "Trash" case already uses for its hand-zone branch.
      const zone = action.target.filter.zone;
      const looseZones = action.from ?? (zone !== undefined && zone !== "battleArea" ? [zone] : undefined);
      if (looseZones !== undefined) {
        const candidates = candidateLooseInstances(ctx, action.target, looseZones);
        const visibleZoneIds =
          looseZones.length === 1 && (looseZones[0] === "trash" || looseZones[0] === "hand")
            ? seatsForController(ctx, action.target.filter).flatMap((seat) =>
                looseCardsInZone(ctx, seat, looseZones[0]!).map((candidate) => candidate.instanceId),
              )
            : undefined;
        const chosen = await pickLoose(ctx, action.target, candidates, undefined, ctx.ask, visibleZoneIds);
        if (chosen.length === 0) {
          if (action.trackCount !== undefined) {
            if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
            ctx.namedCounts.set(action.trackCount, 0);
          }
          if (action.bindResultAs) {
            ctx.boundPlayed ??= new Map();
            ctx.boundPlayed.set(action.bindResultAs, new Set());
          }
          return false;
        }
        let ordered = chosen;
        if (action.order === "any" && chosen.length > 1) {
          ordered =
            (await ctx.ask.orderCards?.(ctx, {
              candidates: chosen,
              visibleCards: candidates
                .filter((candidate) => chosen.includes(candidate.instanceId))
                .map((candidate) => ({
                  instanceId: candidate.instanceId,
                  cardId: candidate.cardId,
                })),
              destination: action.to === "deckTop" ? "deckTop" : "deckBottom",
            })) ?? chosen;
        }
        const moved =
          action.to === "hand"
            ? await ctx.fx.returnToHand(ordered)
            : await ctx.fx.returnToDeck(action.to === "deckTop" ? [...ordered].reverse() : ordered, {
                toTop: action.to === "deckTop",
              });
        if (action.bindResultAs) {
          ctx.boundPlayed ??= new Map();
          ctx.boundPlayed.set(action.bindResultAs, new Set(moved.map((card) => card.instanceId)));
        }
        if (action.trackCount !== undefined) {
          if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
          ctx.namedCounts.set(action.trackCount, moved.length);
        }
        return false;
      }
      const ids = topInstanceIds(ctx, await resolvePermanentTargets(ctx, action.target));
      if (ids.length === 0) {
        if (action.trackCount !== undefined) {
          if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
          ctx.namedCounts.set(action.trackCount, 0);
        }
        if (action.bindResultAs) {
          ctx.boundPlayed ??= new Map();
          ctx.boundPlayed.set(action.bindResultAs, new Set());
        }
        return false;
      }
      const moved =
        action.to === "hand"
          ? await ctx.fx.returnToHand(ids)
          : await ctx.fx.returnToDeck(ids, { toTop: action.to === "deckTop" });
      if (action.bindResultAs) {
        ctx.boundPlayed ??= new Map();
        ctx.boundPlayed.set(action.bindResultAs, new Set(moved.map((card) => card.instanceId)));
      }
      if (action.trackCount !== undefined) {
        if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
        ctx.namedCounts.set(action.trackCount, moved.length);
      }
      return false;
    }
    case "Suspend": {
      // "For each one, suspend 1 ..." (EX6-060): a scale factor (the paid count of an
      // up-to cost, or a "for each" hint) multiplies the target COUNT for this verb.
      const target =
        scale !== undefined && typeof action.target.count === "number"
          ? { ...action.target, count: action.target.count * scale }
          : action.target;
      const ids = await resolvePermanentTargets(ctx, target);
      const suspendResult = ids.length > 0 ? await ctx.fx.suspend(ids, { byEffectSeat: ctx.source.ownerSeat }) : [];
      // The primitive owns transition legality (already suspended, restrictions). Effects
      // whose text says "suspend ... If you did" must key off the permanents that really
      // changed orientation, not merely the candidates selected by the player.
      const suspendedIds = suspendResult;
      ctx.lastSuspendedPermanentIds = suspendedIds;
      // `suspend()` may open nested trigger windows whose target resolution mutates the
      // shared context. Rebind sameTarget AFTER those windows finish, using the primitive's
      // transition receipt rather than the pre-action selection. This keeps continuations
      // such as Samādhi Śānti's "that Digimon/Tamer can't unsuspend" attached to the card
      // this effect actually suspended, and to nothing when suspension did not occur.
      ctx.lastResolvedPermanentIds = suspendedIds;
      ctx.lastEffectActed = suspendedIds.length > 0;
      // Bind "the Digimon this effect suspended" so a later action can reference exactly the
      // permanents that were suspended (empty when 0 resolved — KB Q4791/Q4792 edge case).
      if (action.bindResultAs) {
        ctx.boundPlayed ??= new Map();
        ctx.boundPlayed.set(action.bindResultAs, new Set(suspendedIds));
      }
      // When `trackCount` is present, store the actual suspended count so a subsequent
      // RepeatPerCount action can loop that many times (BT2-041, KB Q1014).
      if (action.trackCount !== undefined) {
        if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
        ctx.namedCounts.set(action.trackCount, suspendedIds.length);
      }
      return false;
    }
    case "RepeatPerCount": {
      // Loop the nested action once per count stored under `countSource` (BT2-041).
      // KB Q1014: each iteration is a separate activation with its own fresh target
      // selection. KB Q1015: all activations share the same timing priority window.
      const repeatCount =
        action.countFilter !== undefined
          ? countMatching(ctx, action.countFilter)
          : (ctx.namedCounts?.get(action.countSource) ?? 0);
      for (let i = 0; i < repeatCount; i++) {
        await runAction(ctx, action.action);
      }
      return false;
    }
    case "Unsuspend": {
      const ids = await resolvePermanentTargets(ctx, action.target);
      if (ids.length > 0) {
        await ctx.fx.unsuspend(ids);
        if (action.target.bindAs !== undefined) {
          ctx.selections ??= new Map();
          ctx.selections.set(action.target.bindAs, ids[0]!);
        }
      }
      return false;
    }
    case "MovePermanent": {
      if (action.direction === "toBreeding") {
        // Self moves into the empty breeding slot (P-143 [End of Your Turn]).
        const self = ctx.source.permanent();
        if (self) await ctx.fx.movePermanentZone(self.permanentId, "toBreeding");
        return false;
      }
      // toBattle: move the controller's lone breeding-area Digimon to the battle area
      // (P-130 [On Play]). Breeding is single-occupancy, so the eligible permanent is the
      // owner's breeding slot when it meets the target filter (your Digimon, level ≥ 3).
      const owner = ctx.game.player(ctx.source.ownerSeat);
      const bred = owner.breeding;
      if (bred === undefined || bred.topCard === undefined) return false;
      // Q4242: a Lv.- Digimon (no level) cannot be referenced by level — not eligible.
      if (ctx.game.definitionOf(bred.topCard).level === undefined) return false;
      if (action.target && !permanentMatchesFilter(ctx, bred, action.target.filter, ctx.source)) {
        return false;
      }
      await ctx.fx.movePermanentZone(bred.permanentId, "toBattle");
      return false;
    }
    case "Hatch": {
      // "Hatch a Digi-Egg" into the controller's empty breeding slot (BT8-091 [On Play]).
      // The primitive no-ops when the Digi-Egg deck is empty or the breeding slot is
      // occupied (Comprehensive Rules §4-17/§6-4) — a faithful no-op, not a loud gap.
      ctx.fx.hatch(ctx.source.ownerSeat);
      return false;
    }
    case "ModifyDP": {
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      const amount = scale === undefined ? action.amount : action.amount * scale;
      for (const id of ids) {
        ctx.fx.modifyDP(
          id,
          amount,
          duration,
          action.continuous === undefined ? undefined : { continuous: action.continuous },
        );
      }
      return false;
    }
    case "AddDPFromSuspendedCost": {
      // payCost() has already selected and suspended the cost target, recording the
      // exact permanent id(s) in this resolution's context. Use the live DP after
      // payment, then apply the attack-scoped delta and keyword grants to the effect
      // target. This keeps the cost selection and the DP source bound together.
      const suspendedIds = ctx.lastSuspendedPermanentIds ?? [];
      if (suspendedIds.length === 0) return action.abortOnDecline === true;
      const amount = suspendedIds.reduce((total, id) => total + (ctx.game.permanentById(id)?.currentDP ?? 0), 0);
      const targetIds = await resolvePermanentTargets(ctx, action.target);
      if (targetIds.length === 0) return false;
      const duration = toDuration(action.duration);
      for (const id of targetIds) {
        ctx.fx.modifyDP(id, amount, duration);
        for (const keyword of action.alsoGainKeywords ?? []) {
          ctx.fx.grantKeyword(id, keyword.keyword, duration, keyword.amount);
        }
      }
      return false;
    }
    case "SetBaseDP": {
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.setBaseDP(id, action.value, duration);
      return false;
    }
    case "GainKeyword": {
      const kw = action.keyword.keyword;
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      // ＜Piercing＞ has a dedicated pierce store; every other CONTINUOUS keyword
      // ability is recorded in the continuous-effect ledger (real server state the
      // combat / keyword-abilities subsystem reads). ACTION-type keywords (those that
      // carry out a verb when gained — De-Digivolve, Digi-Burst, Recovery, ...) have
      // no continuous representation and remain loud gaps until their verb is wired.
      if (kw === "Piercing") {
        for (const id of ids) ctx.fx.grantPierce(id, duration);
        return false;
      }
      if (kw === "LinkMax") {
        // ＜Link +N＞ raises the affected permanent's link limit.
        // Recorded in the continuous ledger; `linkMax` (mindLink.ts) sums it on the base 1.
        const delta = action.keyword.amount ?? 1;
        for (const id of ids) ctx.fx.grantLinkMax(id, delta, duration);
        return false;
      }
      if (ACTION_TYPE_KEYWORDS.has(kw)) {
        // Action-type keywords carry out a VERB when gained, not a continuous ability.
        if (kw === "Recovery") {
          // ＜Recovery +N (Deck)＞: place the top N of your deck onto your security.
          await ctx.fx.recoverToSecurity(ctx.source.ownerSeat, action.keyword.amount ?? 1);
          return false;
        }
        if (kw === "DeDigivolve") {
          // ＜De-Digivolve N＞ on a target (the verb form). Targets resolved above. The trashing
          // effect's seat gates EX11-070's stacked-trash-lock (KB Q5943: an opponent <De-Digivolve>
          // can't strip a locked host's sources).
          for (const id of ids)
            ctx.fx.deDigivolve(id, action.keyword.amount ?? 1, { byEffectSeat: ctx.source.ownerSeat });
          return false;
        }
        if (kw === "Draw") {
          // runtime record mis-encodes <Draw N> as GainKeyword on some cards (e.g. BT22-079).
          // Treat it as the draw verb until the runtime record is fixed.
          await ctx.fx.draw(ctx.source.ownerSeat, action.keyword.amount ?? 1);
          return false;
        }
        unsupported(ctx, action, `grant action-keyword ＜${kw}＞ needs its verb wired`);
        return false;
      }
      // `count` grants the keyword N times to each target (default 1). Each call to
      // grantKeyword adds a separate entry in the continuous ledger so that Alliance ×2
      // produces two grants — the consuming side sums each Alliance entry as one extra
      // security check (KB Q3163, BT19-091: "gains <Alliance> twice").
      const grantCount = action.count ?? 1;
      const keywordAmount = scale === undefined ? action.keyword.amount : (action.keyword.amount ?? 1) * scale;
      for (const id of ids) {
        for (let i = 0; i < grantCount; i++) {
          const active =
            action.whileMatchesTargetFilter === true
              ? () => {
                  const permanent = ctx.game.permanentById(id);
                  return (
                    permanent !== undefined && permanentMatchesFilter(ctx, permanent, action.target.filter, ctx.source)
                  );
                }
              : undefined;
          ctx.fx.grantKeyword(id, kw, duration, keywordAmount, {
            ...(active === undefined ? {} : { active }),
            sourceCardId: ctx.source.cardId,
            sourceEffectText: ctx.activeEffectText,
          });
        }
      }
      return false;
    }
    case "PlayMultiple": {
      const from = Array.isArray(action.from)
        ? action.from
        : [action.from === "digivolution" ? "digivolutionCards" : action.from];
      const target: Target = { filter: action.filter, count: "all", upTo: true };
      const candidates = candidateLooseInstances(ctx, target, from);
      if (candidates.length === 0) {
        ctx.lastPlayedPermanentIds = [];
        return false;
      }
      const selected = await ctx.ask.selectCards(ctx, {
        candidates: candidates.map((c) => c.instanceId),
        min: action.optional ? 0 : 1,
        max: candidates.length,
      });
      const chosen: string[] = [];
      let usedCost = 0;
      for (const instanceId of selected) {
        const cand = candidates.find((c) => c.instanceId === instanceId);
        if (cand === undefined) continue;
        const playCost = ctx.game.definitionOf({ cardId: cand.cardId } as never).playCost;
        if (playCost === undefined || usedCost + playCost > action.totalCost) continue;
        chosen.push(instanceId);
        usedCost += playCost;
      }
      if (chosen.length === 0) {
        ctx.lastPlayedPermanentIds = [];
        return false;
      }
      const played = await ctx.fx.playInstances(chosen, {
        payCost: action.payCost,
        ...(action.suppressOnPlayEffects === true ? { suppressOnPlayEffects: true } : {}),
      });
      ctx.lastPlayedPermanentIds = (played ?? []).map((p) => p.permanentId);
      return false;
    }
    case "PlayWithoutCost": {
      // Bind "the Digimon this effect played" from whichever branch resolves the play, so a later
      // action (e.g. BT16-015's Delete with dp.valueFrom) can reference exactly what was played.
      const bindPlayWithoutCost = () => {
        if (action.bindResultAs && ctx.lastPlayedPermanentIds && ctx.lastPlayedPermanentIds.length > 0) {
          ctx.boundPlayed ??= new Map();
          ctx.boundPlayed.set(action.bindResultAs, new Set(ctx.lastPlayedPermanentIds));
        }
      };
      // ＜Delay＞-armed gate: if the action is marked requiresDelayArmed, the source permanent
      // must carry an active Delay keyword grant (armed by a prior GainKeyword(Delay) on an
      // earlier turn). Off-field source → skip. Armed → consume the grant, then proceed.
      if (action.requiresDelayArmed === true) {
        if (ctx.delayArmedConsumed !== true) {
          const self = ctx.source.permanent();
          if (self === undefined) return false;
          const hasDelay = (ctx.fx.grantedKeywords?.(self.permanentId) ?? []).some((g) => g.keyword === "Delay");
          if (!hasDelay) return false;
          ctx.fx.revokeKeyword?.(self.permanentId, "Delay");
        }
      }
      // Empty-breeding gate: a breeding-area play requires the slot empty (single-occupancy
      // rule) — BT18-101 "play [Lucemon: Larva] to your EMPTY breeding area". Honor both the
      // real `breeding: true` flag the card emits and the spec's `requiresEmpty` form.
      if (action.requiresEmpty === "breedingArea" || action.breeding === true) {
        const mine = ctx.source.ownerSeat;
        const breeding = ctx.game.player(mine).breeding;
        if (breeding !== undefined && breeding.topCard !== undefined) return false;
      }
      if (action.target?.isSelf || action.target?.filter?.isSelfRef) {
        // "Play this card without paying its cost" — from security (the common
        // [Security] form) or from hand.
        const self = ctx.source;
        // Self-play actions bypass the loose-candidate pool below, so enforce the
        // same player-level effect-play prohibition explicitly (Crimson Blaze vs.
        // a Digimon's own Security "play this card" effect).
        if (ctx.fx.isPlayProhibited?.(self.ownerSeat, self.cardId, "play") === true) {
          ctx.lastPlayedPermanentIds = [];
          return false;
        }
        const fromSecurity = action.from?.includes("security") ?? ctx.source.permanent() === undefined;
        if (fromSecurity) {
          const played = await ctx.fx.playFromSecurity(self.instanceId, { payCost: action.payCost });
          ctx.lastPlayedPermanentIds = played !== undefined ? [played.permanentId] : [];
        } else if (action.from?.includes("trash") === true) {
          // "Play this card FROM THE TRASH ..." (BT2-083's OnDeletion revive, EX7-060's
          // `[Trash][Main]` self-play): the source is a loose trash-resident CardInstance,
          // not a hand card — `playFromHand`'s `locateInHand` cannot find it there (a
          // silent no-op; the trash-activation half of the eighth engine gap). Route
          // through the zone-agnostic `playInstances` instead, which locates a loose
          // instance in ANY zone.
          const played = await ctx.fx.playInstances([self.instanceId], {
            payCost: action.payCost,
            ...(action.reduceCostBy !== undefined ? { costDelta: action.reduceCostBy } : {}),
          });
          ctx.lastPlayedPermanentIds = (played ?? []).map((p) => p.permanentId);
        } else {
          // "Play this card with the play cost reduced by N" (EX10-035): fold the reduction into
          // the play verb when paying. A free play (payCost false) ignores reduceCostBy.
          // This is an effect-driven play, not a bare zone move. Route through the
          // generalized play seam so the card's [On Play] window and `whenPlayed`
          // watchers both fire (the same contract used by filtered plays).
          const played = await ctx.fx.playInstances([self.instanceId], {
            payCost: action.payCost,
            ...(action.reduceCostBy !== undefined ? { costDelta: action.reduceCostBy } : {}),
          });
          ctx.lastPlayedPermanentIds = (played ?? []).map((p) => p.permanentId);
        }
        bindPlayWithoutCost();
        return false;
      }
      // "Play N [X] from THIS Digimon's OWN digivolution cards" (BT22-007, KB Q4858-Q4860):
      // source strictly from the SOURCE permanent's stack (not every battle-area permanent's, and
      // valid for a breeding-area source). Play up to `count` matching cards, as many as possible.
      if (action.fromOwnDigivolutionStack) {
        const self = ctx.source.permanent();
        if (self === undefined) return false;
        const matching = self.stack.filter((c) =>
          definitionMatches(action.target.filter, ctx.game.definitionOf({ cardId: c.cardId } as never)),
        );
        if (matching.length === 0) {
          ctx.lastEffectActed = false;
          return false;
        }
        const cap = action.target.count === "all" ? matching.length : Math.min(action.target.count, matching.length);
        // KB Q4860: play 3 (or as many as possible up to the cap) — a mandatory as-many-as-possible
        // selection, NOT an "up to" partial. Take the first `cap` matching stack cards.
        const chosenOwn = matching.slice(0, cap).map((c) => c.instanceId);
        if (chosenOwn.length > 0) {
          const played = await ctx.fx.playInstances(chosenOwn, {
            payCost: action.payCost,
            ...(action.suspended === true ? { suspended: true } : {}),
            ...(action.suppressOnPlayEffects === true ? { suppressOnPlayEffects: true } : {}),
          });
          ctx.lastPlayedPermanentIds = (played ?? []).map((p) => p.permanentId);
        } else {
          ctx.lastPlayedPermanentIds = [];
        }
        ctx.lastEffectActed = chosenOwn.length > 0;
        bindPlayWithoutCost();
        return false;
      }
      // Filtered "play N [X] from <zones> without paying the cost". Resolve the
      // candidate loose cards by filter across the stated zones (defaulting to the
      // hand), prompt the controller, and play the chosen instances.
      //
      // dpCeilingModifier: raise or lower the dp filter's value ceiling before resolving
      // candidates. The scaled count comes from either a prior Trash action's `trackCount`
      // (`scalingSource`, CAP-E13, BT20-077) or a live board count (`scaling`, EX11-032's
      // "for each suspended Digimon"). If the adjusted ceiling is ≤ 0 the candidate pool is
      // empty and no card can be played.
      const scaledPlayTarget: Target =
        action.scaling !== undefined && typeof action.target.count === "number"
          ? {
              ...action.target,
              count: action.target.count * scaleFactor(ctx, action.scaling),
            }
          : action.target;
      const playTarget = (() => {
        const mod = action.dpCeilingModifier;
        if (mod === undefined) return scaledPlayTarget;
        const scaledCount =
          mod.scaling !== undefined
            ? scaleFactor(ctx, mod.scaling)
            : (ctx.namedCounts?.get(mod.scalingSource ?? "") ?? 0);
        const adjustment = mod.amount * scaledCount;
        const origDp = scaledPlayTarget.filter.dp;
        if (origDp === undefined || typeof origDp !== "object" || !("value" in origDp)) return scaledPlayTarget;
        const newValue =
          mod.mode === "raiseCeiling" ? (origDp.value as number) + adjustment : (origDp.value as number) - adjustment;
        if (newValue <= 0) {
          // Adjusted ceiling is non-positive: no card qualifies.
          return { ...scaledPlayTarget, filter: { ...scaledPlayTarget.filter, dp: { ...origDp, value: -1 } } };
        }
        return { ...scaledPlayTarget, filter: { ...scaledPlayTarget.filter, dp: { ...origDp, value: newValue } } };
      })();
      // playCostCeiling: dynamically raise the playCostLte ceiling before resolving candidates.
      // Counts cards matching filter.zone/controller across all applicable seats, then computes:
      //   ceiling = base + Math.floor(totalCards / per) * raise
      // and overrides the target filter's playCostLte with the result. (CAP-E16, BT21-079)
      const playCostAdjustedTarget = (() => {
        const ceiling = action.playCostCeiling;
        if (ceiling === undefined) return playTarget;
        const mine = ctx.source.ownerSeat;
        const opp = ctx.game.opponentOf(mine);
        const f = ceiling.filter;
        const zone = (f as { zone?: string }).zone;
        const controller = (f as { controller?: string }).controller;
        const seats: Seat[] =
          controller === "both" || controller === undefined ? [mine, opp] : controller === "opponent" ? [opp] : [mine];
        let totalCards = 0;
        if (ceiling.unit === "digivolutionCards") {
          for (const seat of seats) {
            for (const permanent of ctx.game.player(seat).battleArea) {
              if (permanentMatchesFilter(ctx, permanent, f, ctx.source)) {
                totalCards += permanent.stack.length;
              }
            }
          }
        } else if (zone === "trash") {
          for (const seat of seats) totalCards += ctx.game.player(seat).trash.length;
        }
        const computedCeiling = ceiling.base + Math.floor(totalCards / ceiling.per) * ceiling.raise;
        return { ...playTarget, filter: { ...playTarget.filter, playCostLte: computedCeiling } };
      })();
      const zones = action.from && action.from.length > 0 ? action.from : DEFAULT_PLAY_ZONES;
      let candidates = candidateLooseInstances(ctx, playCostAdjustedTarget, zones);
      // Seat-level RestrictPlay: drop candidates the resolving effect's owner is forbidden
      // from playing (the effect is attributed to ctx.source.ownerSeat, so the prohibition on
      // THAT seat applies — Q4676; the source player's own effects are unaffected — Q4675).
      candidates = candidates.filter((c) => !ctx.fx.isPlayProhibited?.(ctx.source.ownerSeat, c.cardId, "play"));
      // sameLevelAsAttacker: restrict to cards whose printed level matches the open attacker
      // (EX12-069 "of the same level as the attacking Digimon"). Return no candidates when
      // no attack is open (no subject/attacker id in the trigger).
      if (action.target?.filter?.sameLevelAsAttacker === true) {
        const attackerId = ctx.trigger.subjectPermanentId ?? ctx.trigger.attackerPermanentId;
        const attackerPermanent = attackerId !== undefined ? ctx.game.permanentById(attackerId) : undefined;
        const attackerLevel =
          attackerPermanent?.topCard !== undefined ? ctx.game.definitionOf(attackerPermanent.topCard).level : undefined;
        candidates =
          attackerLevel !== undefined
            ? candidates.filter((c) => ctx.game.definitionOf({ cardId: c.cardId } as never).level === attackerLevel)
            : [];
      }
      // notSameNameAs: "without the same name as cards in the battle area or trash" (EX5 Deva
      // Security effects). Drop any candidate whose card name already appears among the
      // controller's permanents (top cards) and/or trash in the listed zones.
      if (action.notSameNameAs && action.notSameNameAs.length > 0) {
        const seat = ctx.source.ownerSeat;
        const player = ctx.game.player(seat);
        const excludedNames = new Set<string>();
        for (const zone of action.notSameNameAs) {
          if (zone === "battleArea") {
            for (const permanent of player.battleArea) {
              if (permanent.topCard === undefined) continue;
              const n = ctx.game.definitionOf(permanent.topCard).nameEn;
              if (n) excludedNames.add(n);
            }
          } else {
            for (const card of player.trash) {
              const n = ctx.game.definitionOf(card).nameEn;
              if (n) excludedNames.add(n);
            }
          }
        }
        candidates = candidates.filter(
          (c) => !excludedNames.has(ctx.game.definitionOf({ cardId: c.cardId } as never).nameEn),
        );
      }
      const visibleZoneIds = zones.every((zone) => zone === "trash" || zone === "hand")
        ? seatsForController(ctx, playCostAdjustedTarget.filter).flatMap((seat) =>
            zones.flatMap((zone) => looseCardsInZone(ctx, seat, zone).map((candidate) => candidate.instanceId)),
          )
        : zones.every((zone) => zone === "digivolutionCards")
          ? [playCostAdjustedTarget.filter, ...(playCostAdjustedTarget.orFilters ?? [])]
              .flatMap((filter) =>
                seatsForController(ctx, filter).flatMap((seat) =>
                  looseCardsInZone(ctx, seat, "digivolutionCards").map(({ instanceId }) => instanceId),
                ),
              )
              .filter((instanceId, index, all) => all.indexOf(instanceId) === index)
          : undefined;
      const chosen = await pickLoose(ctx, playCostAdjustedTarget, candidates, undefined, ctx.ask, visibleZoneIds);
      if (chosen.length > 0) {
        // Options are USED, not played as permanents. `playInstances` intentionally rejects
        // Option definitions, so routing every PlayWithoutCost target through it silently
        // dropped effects such as BT4-089 using Hell's Gate from hand. Preserve the Option
        // lifecycle here: resolve [Main], move it to trash, and fire whenOptionUsed. The
        // printed cost is still reported to watchers even though this action pays no cost.
        const optionIds = chosen.filter((instanceId) => {
          const candidate = candidates.find((c) => c.instanceId === instanceId);
          if (candidate === undefined) return false;
          return ctx.game.definitionOf({ cardId: candidate.cardId } as never).kinds.includes(CardKind.Option);
        });
        for (const optionId of optionIds) {
          const candidate = candidates.find((c) => c.instanceId === optionId);
          const usedCost =
            candidate === undefined ? undefined : ctx.game.definitionOf({ cardId: candidate.cardId } as never).playCost;
          await ctx.fx.useOptionFromHand(ctx, optionId, usedCost);
        }
        const permanentIds = chosen.filter((instanceId) => !optionIds.includes(instanceId));
        const played =
          permanentIds.length > 0
            ? await ctx.fx.playInstances(permanentIds, {
                payCost: action.payCost,
                breeding: action.breeding,
                suspended: action.suspended,
                effectSourceCardId: ctx.source.cardId,
                ...(action.reduceCostBy !== undefined ? { costDelta: action.reduceCostBy } : {}),
                ...(action.suppressOnPlayEffects === true ? { suppressOnPlayEffects: true } : {}),
              })
            : [];
        ctx.lastPlayedPermanentIds = (played ?? []).map((p) => p.permanentId);
      } else {
        ctx.lastPlayedPermanentIds = [];
      }
      // Bind the branch-acted result so an "if you did" tail (BT16-094 OR-modal) can gate.
      ctx.lastEffectActed = chosen.length > 0;
      bindPlayWithoutCost();
      return false;
    }
    case "PlayFromZone": {
      // CAP-A10 (BT19-099): play a card from specified zone(s) with an optional cost reduction.
      // Semantics: gather candidates from `from` zones, post-filter by relativeToLeavingDigimon
      // when present, prompt the controller, then play the chosen instance with cost reduced by
      // `costReduction` (floored at 0). `payCost` defaults to true; false means free play.
      const zones = action.from && action.from.length > 0 ? action.from : DEFAULT_PLAY_ZONES;
      let pfzCandidates = candidateLooseInstances(ctx, action.target, zones);

      // relativeToLeavingDigimon: the target's printed playCost must equal the triggering
      // leaving Digimon's playCost + N (BT19-099 ＜Delay＞ body, KB Q3175).
      // The leaving Digimon is identified via ctx.trigger.subjectPermanentId (the whenLeavesPlay
      // event subject). Because the permanent may have already left the field, its playCost is
      // read from the definition via its last-known cardId stored on the trigger.
      const playCostFilter = action.target?.filter?.playCost;
      if (
        playCostFilter !== null &&
        typeof playCostFilter === "object" &&
        "relativeToLeavingDigimon" in playCostFilter
      ) {
        // whenLeavesPlay fires with `deletedPermanentId` BEFORE removal, so the permanent is
        // still live on the board and its playCost is readable. Fall back to subjectPermanentId
        // for other event seams.
        const leavingId = ctx.trigger.deletedPermanentId ?? ctx.trigger.subjectPermanentId;
        const leavingPerm = leavingId !== undefined ? ctx.game.permanentById(leavingId) : undefined;
        const leavingCost =
          leavingPerm?.topCard !== undefined ? (ctx.game.definitionOf(leavingPerm.topCard).playCost ?? 0) : undefined;
        if (leavingCost === undefined) {
          // No triggering Digimon in context — the condition can't be evaluated; skip play.
          ctx.lastEffectActed = false;
          return false;
        }
        const targetCost = leavingCost + playCostFilter.relativeToLeavingDigimon;
        pfzCandidates = pfzCandidates.filter(
          (c) => (ctx.game.definitionOf({ cardId: c.cardId } as never).playCost ?? 0) === targetCost,
        );
      }

      const payCost = action.payCost !== false; // true by default
      // Static reduction plus an optional per-unit dynamic reduction scoped to THIS play
      // ("reduce this effect's paid play cost by 1 for each face-up security card", EX11-034).
      const scaledReduction =
        action.costReductionScaling !== undefined ? scaleFactor(ctx, action.costReductionScaling) : 0;
      const costDelta = payCost ? (action.costReduction ?? 0) + scaledReduction : 0;
      const pfzChosen = await pickLoose(ctx, action.target, pfzCandidates);
      if (pfzChosen.length > 0) {
        const played = await ctx.fx.playInstances(pfzChosen, {
          payCost,
          ...(costDelta > 0 ? { costDelta } : {}),
          ...(action.suppressOnPlayEffects === true ? { suppressOnPlayEffects: true } : {}),
        });
        ctx.lastPlayedPermanentIds = (played ?? []).map((p) => p.permanentId);
        if (action.bindResultAs && ctx.lastPlayedPermanentIds.length > 0) {
          if (!ctx.boundPlayed) (ctx as { boundPlayed: Map<string, Set<string>> }).boundPlayed = new Map();
          ctx.boundPlayed!.set(action.bindResultAs, new Set(ctx.lastPlayedPermanentIds));
        }
      } else {
        ctx.lastPlayedPermanentIds = [];
      }
      ctx.lastEffectActed = pfzChosen.length > 0;
      return false;
    }
    case "Search": {
      const seat = ctx.source.ownerSeat;
      const searchZone = action.searchZone ?? action.filter.zone;
      if (searchZone === "security") {
        const security = ctx.game.player(seat).security;
        const { zone: _zone, ...definitionFilter } = action.filter;
        const candidates = security.filter((card) =>
          definitionMatches(definitionFilter, ctx.game.definitionOf(card) as DefinitionFacts),
        );
        const maximum = action.count === "all" ? candidates.length : action.count;
        const selectedIds = await ctx.ask.selectCards(ctx, {
          candidates: candidates.map((card) => card.instanceId),
          min: 0,
          max: Math.min(maximum, candidates.length),
          visible: security.map((card) => card.instanceId),
          visibleCards: security.map((card) => ({
            instanceId: card.instanceId,
            cardId: card.cardId,
          })),
        });
        const selected = candidates.filter((card) => selectedIds.includes(card.instanceId));
        for (const card of selected) card.faceUp = true;
        ctx.lastRevealedCards = selected.map((card) => ({
          instanceId: card.instanceId,
          cardId: card.cardId,
          ownerSeat: card.ownerSeat,
        }));
        if (action.bindResultAs !== undefined) {
          ctx.boundPlayed ??= new Map();
          ctx.boundPlayed.set(action.bindResultAs, new Set(selectedIds));
        }
        if (action.then?.kind === "PlayWithoutCost") {
          const played =
            selectedIds.length > 0 ? await ctx.fx.playInstances(selectedIds, { payCost: action.then.payCost }) : [];
          ctx.lastPlayedPermanentIds = (played ?? []).map((permanent) => permanent.permanentId);
        } else if (action.to === "hand" && selectedIds.length > 0) {
          await ctx.fx.returnToHand(selectedIds);
        }
        ctx.lastEffectActed =
          action.then?.kind === "PlayWithoutCost"
            ? (ctx.lastPlayedPermanentIds?.length ?? 0) > 0
            : selectedIds.length > 0;
        return false;
      }
      ctx.lastRevealedCards = undefined;
      await ctx.fx.searchDeck(seat, (def) => definitionMatches(action.filter, def), {
        min: 0,
        max: action.count === "all" ? Number.MAX_SAFE_INTEGER : action.count,
      });
      return false;
    }
    case "SearchSecurity": {
      const continuationSource: string = action.then.source;
      if (continuationSource !== "security") {
        unsupported(ctx, action, `SearchSecurity cannot continue from ${continuationSource}`);
        return false;
      }
      const security = ctx.game.player(ctx.source.ownerSeat).security;
      const candidates = security.filter((card) =>
        definitionMatches(action.target.filter, ctx.game.definitionOf(card) as DefinitionFacts),
      );
      const maximum =
        action.target.count === "all" ? candidates.length : Math.min(action.target.count, candidates.length);
      const minimum = action.then.optional === true || action.target.upTo === true ? 0 : maximum;
      const selectedIds = await ctx.ask.selectCards(ctx, {
        candidates: candidates.map((card) => card.instanceId),
        min: minimum,
        max: maximum,
        visible: security.map((card) => card.instanceId),
        // Security is private and therefore absent from the normal client instance index.
        // Send the authoritative identities with the decision so the search modal renders
        // real cards instead of anonymous placeholders (ST10-06 / Mastemon).
        visibleCards: security.map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
      });
      if (selectedIds.length === 0) {
        ctx.lastEffectActed = false;
        return false;
      }
      const played = await ctx.fx.playInstances(selectedIds, { payCost: action.then.payCost });
      ctx.lastPlayedPermanentIds = (played ?? []).map((permanent) => permanent.permanentId);
      ctx.lastEffectActed = ctx.lastPlayedPermanentIds.length > 0;
      return false;
    }
    case "Reveal": {
      await runReveal(ctx, action);
      return false;
    }
    case "RevealAdd": {
      await runRevealAdd(ctx, action);
      return false;
    }
    case "RevealChooseDeleteBudget": {
      await runRevealChooseDeleteBudget(ctx, action);
      return false;
    }
    case "AddToHandSelf": {
      // "Add this card to its owner's hand" — the card is a security card.
      await ctx.fx.returnToHand([ctx.source.instanceId]);
      return false;
    }
    case "PlaceInBattleAreaSelf": {
      // "Place this card in the battle area" — self-placement of the resolving card.
      // An Option (the ＜Delay＞ "Then, place this card in the battle area" tail and
      // the matching [Security] effect) becomes an option PERMANENT (source
      // the effect runtime.PlaceDelayOptionCards), located wherever it currently sits
      // (trash mid-[Main] resolution, security mid-check). A Digimon/Tamer self-place
      // only occurs from a [Security] effect, so it plays out of security (free).
      // Kind routing is a static card fact: prefer the shared card table (the
      // context's source definition may be a test fixture), falling back for
      // synthetic ids.
      if (action.target !== undefined) {
        const zones = action.target.from ?? action.target.source ?? action.target.zone ?? "hand";
        const zoneList = (Array.isArray(zones) ? zones : [zones]) as ZoneRef[];
        const candidates = candidateLooseInstances(ctx, action.target, zoneList);
        const visible = seatsForController(ctx, action.target.filter)
          .flatMap((seat) => zoneList.flatMap((zone) => looseCardsInZone(ctx, seat, zone)))
          .map((candidate) => candidate.instanceId);
        const chosen = await pickLoose(ctx, action.target, candidates, undefined, ctx.ask, visible);
        for (const instanceId of chosen) await ctx.fx.placeOptionAsPermanent?.(instanceId);
        ctx.lastEffectActed = chosen.length > 0;
        return false;
      }
      const selfKinds = getCardDefinition(ctx.source.cardId)?.kinds ?? ctx.source.definition.kinds;
      if (selfKinds.includes(CardKind.Option)) {
        await ctx.fx.placeOptionAsPermanent?.(ctx.source.instanceId);
      } else {
        if (ctx.fx.isPlayProhibited?.(ctx.source.ownerSeat, ctx.source.cardId, "play") === true) {
          return false;
        }
        await ctx.fx.playFromSecurity(ctx.source.instanceId, { payCost: false });
      }
      return false;
    }
    case "Restrict": {
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      // Target-scoped prohibition (BT10-042): affected Digimon can't attack THIS source,
      // but may still attack the player or a different Digimon. A plain `attack`
      // restriction would incorrectly suppress the entire declaration.
      if ((action as typeof action & { specificTarget?: string }).specificTarget === "source") {
        const sourcePermanentId = ctx.source.permanent()?.permanentId;
        if (sourcePermanentId !== undefined) {
          for (const id of ids) ctx.fx.restrictAttackTarget(id, sourcePermanentId, duration);
        }
        return false;
      }
      if ((action.restriction as string) === "attackOrBlock") {
        for (const id of ids) {
          ctx.fx.restrict(id, "attack", duration);
          ctx.fx.restrict(id, "block", duration);
        }
        return false;
      }
      const restriction = action.restriction as Restriction;
      // A deprecated kind has no consumer, so recording it would be a silent no-op. Drop it
      // here instead: `restrict()` no longer accepts one, and the ~32 IR records still
      // carrying `activateEffects` are superseded by the disableSecurityEffect /
      // disableTimingEffect verbs.
      if (restriction === "activateEffects") return false;
      const fromSourceKind = action.fromSourceKind as string[] | undefined;
      const byOpponentEffectsOnly = action.byOpponentEffectsOnly === true ? true : undefined;
      for (const id of ids) ctx.fx.restrict(id, restriction, duration, { fromSourceKind, byOpponentEffectsOnly });
      return false;
    }
    case "RestrictUnsuspendedDigivolve": {
      const seat = action.seat === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
      ctx.fx.restrictUnsuspendedDigivolve(seat, ctx.source.ownerSeat, toDuration(action.duration));
      return false;
    }
    case "GrantCanAttackUnsuspended": {
      // "This Digimon may also attack your opponent's unsuspended Digimon" (ST12-08): a
      // positive attack-legality grant on the resolved target(s), read by combat legality.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      const noDigivolutionCards = action.noDigivolutionCards === true;
      for (const id of ids) ctx.fx.grantCanAttackUnsuspended(id, duration, { noDigivolutionCards });
      return false;
    }
    case "GrantVortexCanAttackPlayers": {
      // EX11-062 [Your Turn]: "while your opponent has no unsuspended Digimon, your ＜Vortex＞ can
      // also attack players" (KB Q5920). A positive ＜Vortex＞ attack-target grant on the resolved
      // target(s) (your Digimon), read by combat legality for a ＜Vortex＞-mode declaration. The
      // [Your Turn] condition (opponent has no unsuspended Digimon) is evaluated by the effect's
      // own condition gate; this records the grant when the effect fires.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.grantVortexCanAttackPlayers?.(id, duration);
      return false;
    }
    case "EndAttack": {
      // "End that attack" (BT23-069): terminate the in-flight attack (transition to
      // end-of-attack). A no-op when no attack is open; changes the timing, not the Digimon.
      ctx.fx.endAttack();
      return false;
    }
    case "ArmSuspendRestriction": {
      // BT23-024: arm the suspend-restriction-with-superlative-exception on THIS source for the
      // stated duration ("until their turn ends" => UntilOpponentTurnEnd). The affected opponent
      // set is recomputed each continuous pass by applySuspendRestrictionRecompute (KB Q5250/Q5252).
      const self = ctx.source.permanent();
      if (self !== undefined) {
        ctx.fx.armSuspendRestrictionSource?.(self.permanentId, toDuration(action.duration ?? "untilOpponentTurnEnd"));
      }
      return false;
    }
    case "RestrictDigivolveInto": {
      // EX10-035: "this Digimon can only digivolve into [Apocalymon]". Record a positive
      // digivolve-target constraint on the resolved target(s) carrying the allowed into-filter;
      // digivolve-legality (validateDigivolve) rejects any other evolving card onto them.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      const into = action.into;
      for (const id of ids) {
        ctx.fx.restrictDigivolveInto?.(id, (def) => definitionMatches(into, def), duration);
      }
      return false;
    }
    case "MinDpFloor": {
      // EX11-070 [All Turns]: "this Digimon can't have less than 1000 DP". A persistent floor on
      // the resolved target(s) (the inherited-effect host), applied in the DP-calc layer AFTER all
      // +/- changes (KB Q5941). Re-derived each continuous pass (CR-01).
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.minDpFloor?.(id, action.floor, duration);
      return false;
    }
    case "StackTrashLock": {
      // EX11-070 [All Turns]: "your opponent's effects can't trash this Digimon's stacked cards"
      // (KB Q5943). A persistent lock on the resolved target(s) (the inherited-effect host),
      // consulted at the digivolution-card trash sites. Re-derived each continuous pass (CR-01).
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.stackTrashLock?.(id, duration);
      return false;
    }
    case "SecurityAttackInvert": {
      // EX6-031 [Your Turn]: "Change ＜Security Attack -＞ to ＜Security Attack +＞ on all of your
      // Digimon" (KB Q3751/Q3752, per-instance sign flip). A persistent per-permanent inversion on
      // the resolved target(s); the security-check strike consumer (GameEngine.runSecurityCheck.
      // strikeFor) negates each existing SA grant's amount while active. Re-derived each continuous
      // pass (CR-01).
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.securityAttackInvert?.(id, duration);
      return false;
    }
    case "DelayedDeletePlayed": {
      // EX10-035: "at turn end, delete the Digimon this effect played." The played permanent is
      // deletes it at the owner's turn end, expiring at that same boundary.
      const self = ctx.source.permanent();
      if (self !== undefined) ctx.fx.delayedDeletePlayed?.(self.permanentId);
      return false;
    }
    case "DelayedDelete": {
      // "At the next end of your opponent's turn, delete it" after a PlayWithoutCost branch.
      // The target is the permanent(s) just created by the prior play action in this same
      // effect resolution, not the card currently resolving the effect.
      for (const permanentId of ctx.lastPlayedPermanentIds ?? []) {
        ctx.fx.delayedDeletePlayed?.(permanentId);
      }
      return false;
    }
    case "DisableSecurityEffect": {
      // `card.PermanentOfThisCard()`. Resolve the target (normally the source itself) and
      // record the security-effect disable; the security-check loop consults it per flip.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.disableSecurityEffect(id, action.sourceKind, duration);
      return false;
    }
    case "DisableTimingEffect": {
      // The disable suppresses the masked timing effects of the resolved (opponent) permanents.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.disableTimingEffect(id, action.timings, duration);
      return false;
    }
    case "Aura": {
      // A "while ..." aura: live exactly while its gate holds. The static-effect
      // builder re-runs this resolve each evaluation, so re-checking the gate here
      // condition gives (it lapses the moment the gate fails). The battle-area guard
      // is implicit (no source permanent => no candidates).
      if (!evaluateCondition(ctx, action.while)) return false;
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = EffectDuration.UntilEachTurnEnd;
      for (const id of ids) {
        switch (action.effect.kind) {
          case "keyword": {
            const kw = action.effect.keyword.keyword;
            const amount =
              action.effect.keyword.amount === undefined
                ? undefined
                : action.effect.keyword.amount * (action.scaling === undefined ? 1 : scaleFactor(ctx, action.scaling));
            if (kw === "Piercing") ctx.fx.grantPierce(id, duration, { continuous: true });
            else if (kw === "LinkMax") {
              ctx.fx.grantLinkMax(id, amount ?? 1, duration, { continuous: true });
            } else {
              ctx.fx.grantKeyword(id, kw, duration, amount, {
                continuous: true,
                sourceCardId: ctx.source.cardId,
                sourceEffectText: ctx.activeEffectText,
              });
            }
            break;
          }
          case "modifyDP":
            ctx.fx.modifyDP(id, action.effect.amount, duration, { continuous: true });
            break;
          case "modifySecurityDP":
            // Security DP is seat-scoped rather than permanent-scoped. Aura target resolution
            // supplies one live host id; apply the seat delta once, not once per board Digimon.
            ctx.fx.modifySecurityDp(
              action.effect.seat === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat,
              action.effect.amount,
              { continuous: true },
            );
            return false;
          case "securityAttack":
            ctx.fx.grantKeyword(id, "SecurityAttack", duration, action.effect.amount, { continuous: true });
            break;
          case "restriction": {
            // Same drop as the `Restrict` action: a deprecated kind has no consumer, so
            // recording it would be a silent no-op rather than a grant.
            const granted = action.effect.restriction as Restriction;
            if (granted !== "activateEffects") {
              ctx.fx.restrict(id, granted, duration, { continuous: true });
            }
            break;
          }
          default:
            break;
        }
      }
      return false;
    }
    case "GrantAuraToOpponents": {
      // Q1f: most corpus instances of this action kind carry no `event`/`actions` at all —
      // only `target` + `effectText` naming the printed granted ability verbatim (a compiler
      // shell for "X gains '[Trigger] Body'" that never finished compiling the body). Iterating
      // `action.actions` for one of these would throw the moment the watched event fires. Route
      // any instance whose `effectText` names a registered library effect through the SAME
      // "grant a named library effect" mechanism GrantStatic's `grant:"effects"` branch uses
      // (`grantCustomEffect` + `GRANTED_EFFECT_LIBRARY`), instead of installing a raw SubTrigger
      // watcher with undefined actions. Instances naming an UNREGISTERED effectText fall through
      // to the pre-existing behavior below unchanged (still a Q1f gap, not made worse here).
      if (
        action.actions === undefined &&
        typeof action.effectText === "string" &&
        action.effectText in GRANTED_EFFECT_LIBRARY
      ) {
        const ids = await resolvePermanentTargets(
          ctx,
          action.target ??
            ({ filter: action.filter ?? { kind: ["Digimon"], controller: "opponent" }, count: "all" } as Target),
        );
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) {
          const permanent = ctx.game.permanentById(id);
          const top = permanent?.topCard;
          if (top === undefined) continue;
          ctx.fx.grantCustomEffect?.(top.instanceId, top.ownerSeat, action.effectText, grantDuration);
        }
        return false;
      }
      // P-075: grant a debuff aura (SubTrigger watcher) to all opponent Digimon.
      // Resolve opponent permanents, install a watcher on each that fires on `action.event`
      // and runs `action.actions`. The scope is ALWAYS the opponent (the action name): force
      // controller:"opponent" onto the filter so a filter that omits it (P-075's IR carries only
      // `{kind:["Digimon"]}`) does not leak the aura onto the controller's own Digimon.
      const candidates = candidatePermanents(ctx, {
        filter: { ...(action.filter ?? { kind: ["Digimon"] }), controller: "opponent" },
        count: "all",
      } as Target);
      const duration = toDuration(action.duration);
      for (const permanent of candidates) {
        // Anchor the watcher to its OWN permanent: `fireSubTrigger(event)` runs every watcher of
        // that event (it passes no sourcePermanentId), so without this gate one Digimon suspending
        // would fire EVERY granted watcher. The body's "this Digimon" semantics require the event
        // subject to BE the watched permanent.
        const anchorId = permanent.permanentId;
        ctx.fx.subscribeSubTrigger({
          event: SUBTRIGGER_EVENT_MAP[action.event] ?? "whenSuspended",
          sourcePermanentId: anchorId,
          once: false,
          description: `GrantAura from ${ctx.source.cardId}`,
          expiresOnTurnEndOf:
            duration === EffectDuration.UntilOpponentTurnEnd
              ? ctx.game.opponentOf(ctx.source.ownerSeat)
              : duration === EffectDuration.UntilOwnerTurnEnd
                ? ctx.source.ownerSeat
                : undefined,
          matches: (subCtx) => {
            // Gate to "this Digimon": fire only when the granted permanent IS the event subject.
            // Lenient by design — when the fired event carries no permanent subject we preserve
            // firing (the prior behavior), so this narrows the over-fire (P-075: one suspend fired
            // every watcher) without silencing granted auras on subject-less events.
            const t = subCtx.trigger;
            const subjectId =
              t.subjectPermanentId ??
              t.suspendedPermanentId ??
              t.unsuspendedPermanentId ??
              t.deletedPermanentId ??
              t.attackerPermanentId;
            return subjectId === undefined || subjectId === anchorId;
          },
          run: async (subCtx) => {
            for (const auraAction of action.actions) {
              await runAction(subCtx, auraAction as Action);
            }
          },
        });
      }
      return false;
    }
    case "DigiXrosMaterialZoneExpansion": {
      // BT19-079 / BT19-087: expand DigiXros material source zones at BeforePayCost.
      // Records per-seat zone expansion for `duration`; the DigiXros material-picking
      // code in the play-card path reads it. For v1 the record is the deliverable.
      const duration = toDuration(action.duration);
      ctx.fx.expandDigiXrosZones?.(ctx.source.ownerSeat, action.zones, duration);
      return false;
    }
    case "GrantStatic": {
      // Registration metadata consumed by the digivolve-cost path. Its live field/turn/OPT
      // gates are enforced when GameEngine selects an eligible redirector permanent.
      if (action.grant === "digisorptionRedirect") return false;
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration("permanent");
      // "nameForDigiXros" (BT19-038) and grant:"name" with digiXrosOnly:true (BT19-012,
      // BT19-051, BT19-061) both encode an alias valid ONLY in DigiXros material matching.
      if (action.grant === "nameForDigiXros" || (action.grant === "name" && action.digiXrosOnly)) {
        const tokens = action.tokens ?? [];
        if (tokens.length === 0) {
          unsupported(ctx, action, "GrantStatic nameForDigiXros with no tokens");
          return false;
        }
        for (const id of ids) ctx.fx.grantNameTrait(id, "name", tokens, duration, { digiXrosOnly: true });
        return false;
      }
      if (action.grant === "name" || action.grant === "trait") {
        const tokens = action.tokens ?? [];
        if (tokens.length === 0) {
          unsupported(ctx, action, "GrantStatic name/trait with no tokens");
          return false;
        }
        for (const id of ids) ctx.fx.grantNameTrait(id, action.grant, tokens, duration);
        return false;
      }
      if (action.grant === "color") {
        const colors = (action.tokens ?? []).filter((token): token is keyof typeof COLOR_MAP => token in COLOR_MAP);
        if (colors.length === 0) {
          unsupported(ctx, action, "GrantStatic color with no valid color token");
          return false;
        }
        const grantDuration = toDuration(action.duration ?? "forTheTurn");
        for (const id of ids) {
          for (const color of colors) ctx.fx.addColorGrant(id, COLOR_MAP[color], grantDuration);
        }
        return false;
      }
      if (action.grant === "kinds") {
        const wantedKinds = (action.tokens ?? []).map((t) => t as CardKind);
        if (wantedKinds.length === 0) {
          unsupported(ctx, action, "GrantStatic kinds with no tokens");
          return false;
        }
        // Unlike the name/trait grant above (which must survive turn boundaries per
        // WR-03/ENG-02), a "treated as a Digimon" kind grant is commonly scoped ("For the
        // turn, ..." — AD1-021, BT12-092, BT21-044) and must respect the IR's own duration
        // instead of the hardcoded `permanent` default the block computes above.
        const kindDuration = toDuration(action.duration ?? "permanent");
        for (const id of ids) ctx.fx.grantKind?.(id, wantedKinds, kindDuration);
        return false;
      }
      // path — "1 of your Digimon gains '[On Deletion] …' until the end of your opponent's
      // turn", RB1-030). Each token names a built-in effect the grant collector compiles to a
      // real Effect anchored on the granted permanent, so it fires through the SAME timing
      // window as a printed effect. This is duration-scoped (NOT permanent / NOT continuous):
      //
      // "effect"/"tokenEffect"/"quotedEffect"/"gainEffect" are the SAME grant under different
      // compiler-emitted labels (confirmed by shape: BT21-057's "tokenEffect" carries a
      // synthetic "GRANTEFFECT23TOKEN" key indistinguishable from an "effects" token; RB1-030's
      // "quotedEffect" carries the printed effect text verbatim as the token). Routing all four
      // through the same `grantCustomEffect` call wires a real consumer for every one of them —
      // `grantedTokenEffectsForTiming` already throws loudly for any token with no
      // `GRANTED_EFFECT_LIBRARY` entry, so an unregistered token now fails fast instead of
      // silently sitting inert in the old `grantCustom` bucket.
      if (
        (action.grant === "effects" ||
          action.grant === "effect" ||
          action.grant === "tokenEffect" ||
          action.grant === "quotedEffect" ||
          action.grant === "gainEffect") &&
        (action.tokens?.length ?? 0) > 0
      ) {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) {
          // Anchor the grant on the granted Digimon's TOP-CARD instance (persists into trash) and
          // the granter's seat (the duration-sweep frame), so a granted [On Deletion] fires on the
          // grantee's own deletion exactly like a printed one.
          const permanent = ctx.game.permanentById(id);
          const top = permanent?.topCard;
          if (top === undefined) continue;
          for (const token of action.tokens ?? []) {
            ctx.fx.grantCustomEffect?.(top.instanceId, top.ownerSeat, token, grantDuration);
          }
        }
        return false;
      }
      // "effects"/"kind" paired with a `staticEffect: { kind: "SetBaseDP" }` payload (BT12-092,
      // BT13-018): "1 of your [X] is also treated as an N DP Digimon" — a DP override, plus (for
      // grant:"kind") a kind grant so a Tamer becomes attack-legal as a Digimon. Both primitives
      // already exist; this just wires the compound grant to them instead of the dead store.
      if (
        (action.grant === "effects" || action.grant === "kind") &&
        typeof action.staticEffect === "object" &&
        action.staticEffect !== null &&
        (action.staticEffect as { kind?: string }).kind === "SetBaseDP"
      ) {
        const value = (action.staticEffect as { value?: number }).value;
        if (typeof value !== "number") {
          unsupported(ctx, action, "GrantStatic SetBaseDP staticEffect with no numeric value");
          return false;
        }
        const grantDuration = toDuration(action.duration ?? "forTheTurn");
        for (const id of ids) ctx.fx.setBaseDP(id, value, grantDuration);
        if (action.grant === "kind") {
          const wantedKinds = (action.tokens ?? []).map((t) => t as CardKind);
          if (wantedKinds.length > 0) {
            for (const id of ids) ctx.fx.grantKind?.(id, wantedKinds, grantDuration);
          }
        }
        return false;
      }
      // "effects" with a structured `filter` and no tokens: "gains all effects of cards with
      // [X] in its digivolution cards" (BT10-011, BT12-072, BT15-039, BT16-014, RB1-009, ...).
      // This is the SAME conferStackEffects consumer the bottom-of-case fallback below already
      // uses for an untagged grant — it was simply unreachable from here because the string
      // catch-all intercepted `grant === "effects"` first.
      if (action.grant === "effects" && action.filter) {
        for (const permanentId of ids) {
          const permanent = ctx.game.permanentById(permanentId);
          if (permanent === undefined) continue;
          for (const stackCard of permanent.stack) {
            const def = ctx.game.definitionOf(stackCard);
            if (!definitionMatches(action.filter, def as DefinitionFacts)) continue;
            ctx.fx.conferStackEffects(permanentId, stackCard.instanceId, duration);
          }
        }
        return false;
      }
      // Color-change grant: "change 1 of their Digimon or Tamers into a color other than white"
      // (BT18-078). The IR stores the choice domain as an object-shaped grant; resolve it into
      // the existing color-grant primitive instead of leaving it in the inert custom-grant bucket.
      if (typeof action.grant === "object" && action.grant !== null && "chooseColorOtherThan" in action.grant) {
        const grant = action.grant as { allowedColors?: string[]; chooseColorOtherThan?: string };
        const labels = (grant.allowedColors ?? ["Red", "Blue", "Yellow", "Green", "Black", "Purple"]).filter(
          (color): color is keyof typeof COLOR_MAP => color in COLOR_MAP,
        );
        if (labels.length === 0) {
          unsupported(ctx, action, "GrantStatic chooseColorOtherThan with no legal colors");
          return false;
        }
        const idx = await ctx.ask.chooseOption(ctx, labels);
        const chosen = COLOR_MAP[labels[idx] ?? labels[0]!];
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.addColorGrant(id, chosen, grantDuration);
        return false;
      }
      // The compiler's other encoding of the same "any color except X" choice (BT18-078):
      // { color: "otherThanWhite" } instead of { chooseColorOtherThan: "White" }. Same flow.
      if (
        typeof action.grant === "object" &&
        action.grant !== null &&
        "color" in action.grant &&
        typeof (action.grant as { color?: unknown }).color === "string" &&
        (action.grant as { color: string }).color.startsWith("otherThan")
      ) {
        const excluded = (action.grant as { color: string }).color.slice("otherThan".length);
        const labels = (["Red", "Blue", "Yellow", "Green", "White", "Black", "Purple"] as const).filter(
          (color): color is keyof typeof COLOR_MAP => color !== excluded && color in COLOR_MAP,
        );
        if (labels.length === 0) {
          unsupported(ctx, action, "GrantStatic color otherThan with no legal colors");
          return false;
        }
        const idx = await ctx.ask.chooseOption(ctx, labels);
        const chosen = COLOR_MAP[labels[idx] ?? labels[0]!];
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.addColorGrant(id, chosen, grantDuration);
        return false;
      }
      // { kind: "PreventSecurityActivation", cardType: "Option" } (BT1-025, BT20-015, BT20-074):
      // "this Digimon doesn't activate [Security] skills on Option cards it checks" — the exact
      // semantics `disableSecurityEffect` already exists for (KB Q886: the card still trashes).
      if (
        typeof action.grant === "object" &&
        action.grant !== null &&
        (action.grant as { kind?: string }).kind === "PreventSecurityActivation"
      ) {
        const cardType = (action.grant as { cardType?: string }).cardType;
        const sourceKind = cardType === "Option" ? "option" : "any";
        const grantDuration = toDuration(action.duration ?? "forTheTurn");
        for (const id of ids) ctx.fx.disableSecurityEffect(id, sourceKind, grantDuration);
        return false;
      }
      // { cannotBeDeletedInBattle: true } (P-098) maps directly onto the existing enforced
      // `beDeletedInBattle` restriction.
      if (
        typeof action.grant === "object" &&
        action.grant !== null &&
        (action.grant as { cannotBeDeletedInBattle?: boolean }).cannotBeDeletedInBattle === true
      ) {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "beDeletedInBattle", grantDuration);
        return false;
      }
      // { keyword: "Unblockable" } (EX4-042) — same semantics as the string "unblockable" case
      // below; both map onto the existing enforced `cantBeBlocked` restriction.
      if (
        typeof action.grant === "object" &&
        action.grant !== null &&
        (action.grant as { keyword?: string }).keyword === "Unblockable"
      ) {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "cantBeBlocked", grantDuration);
        return false;
      }
      // { immunity: true } (BT17-016, EX7-034) / { immuneToOpponentEffects: true } (BT20-019):
      // blanket "isn't affected by your opponent's effects" — the same unqualified `beAffected`
      // restriction the dedicated `GrantImmunity` action installs (line ~4210 below).
      if (
        typeof action.grant === "object" &&
        action.grant !== null &&
        ((action.grant as { immunity?: boolean }).immunity === true ||
          (action.grant as { immuneToOpponentEffects?: boolean }).immuneToOpponentEffects === true)
      ) {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "beAffected", grantDuration);
        return false;
      }
      // { kind: "Protection", protections: [...] } (BT16-055, P-162, ST17-07) — a compound grant
      // decomposed into one `restrict()` call per named protection, each onto an ALREADY
      // enforced restriction kind. Unknown protection tokens fail loudly rather than being
      // silently dropped.
      if (
        typeof action.grant === "object" &&
        action.grant !== null &&
        (action.grant as { kind?: string }).kind === "Protection"
      ) {
        const protections = (action.grant as { protections?: string[] }).protections ?? [];
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const token of protections) {
          const mapped = PROTECTION_TOKEN_MAP[token];
          if (mapped === undefined) {
            unsupported(ctx, action, `GrantStatic Protection with unknown protection "${token}"`);
            continue;
          }
          for (const id of ids) {
            ctx.fx.restrict(id, mapped.restriction, grantDuration, {
              byOpponentEffectsOnly: mapped.byOpponentEffectsOnly,
            });
          }
        }
        return false;
      }
      // { copyEffectsFromDigivolution: { filter: "<raw printed text>" } } (BT16-062, BT22-078,
      // EX10-059) — "gains all effects of digivolution cards matching [name]/[trait]/level N".
      // The compiler captured the raw clause text instead of a structured filter; parse the
      // common "[X] in ... names"/"[X] trait"/"level N" shapes it actually uses and route
      // through the SAME `conferStackEffects` consumer the structured-filter "effects" grant
      // above uses. Unparseable text still fails loudly rather than being silently dropped.
      if (typeof action.grant === "object" && action.grant !== null && "copyEffectsFromDigivolution" in action.grant) {
        const raw = (action.grant as { copyEffectsFromDigivolution?: { filter?: string } }).copyEffectsFromDigivolution
          ?.filter;
        const parsedFilter = typeof raw === "string" ? parseCopyEffectsFilterText(raw) : undefined;
        if (parsedFilter === undefined) {
          unsupported(ctx, action, `GrantStatic copyEffectsFromDigivolution with unparseable filter "${raw}"`);
          return false;
        }
        for (const permanentId of ids) {
          const permanent = ctx.game.permanentById(permanentId);
          if (permanent === undefined) continue;
          for (const stackCard of permanent.stack) {
            const def = ctx.game.definitionOf(stackCard);
            if (!definitionMatches(parsedFilter, def as DefinitionFacts)) continue;
            ctx.fx.conferStackEffects(permanentId, stackCard.instanceId, duration);
          }
        }
        return false;
      }
      // Object-shaped grants that genuinely have no enforcement path yet (would need a new
      // combat/DNA-digivolve/DigiXros subsystem, not just a missing primitive wire-up). Failing
      // loudly here — instead of the old silent `grantCustom` store — surfaces them the moment
      // a game actually resolves one, matching the fail-loud shape used across this case.
      if (typeof action.grant === "object" && action.grant !== null) {
        if ((action.grant as { kind?: string }).kind === "TreatAsLevel") {
          const grant = action.grant as { level?: number; context?: string; intoNames?: string[] };
          if (grant.context !== "DNADigivolution" || grant.level === undefined) {
            unsupported(ctx, action, "TreatAsLevel requires a DNA context and numeric level");
            return false;
          }
          for (const permanentId of ids) {
            ctx.fx.grantDnaLevel(permanentId, grant.level, {
              intoNames: grant.intoNames,
              continuous: true,
            });
          }
          return false;
        }
        const objectGrantKind =
          "kind" in action.grant ? String((action.grant as { kind: unknown }).kind) : JSON.stringify(action.grant);
        unsupported(ctx, action, `GrantStatic object grant "${objectGrantKind}" has no enforcement path yet`);
        return false;
      }
      // immuneToOpponentOptionEffects: the targeted Digimon is not affected by the opponent's
      // Option card effects for the duration. Stored as a beAffected restriction qualified to
      // Option-sourced effects; the target-resolution path excludes immune permanents when the
      // resolving card is an opponent's Option (CAP-A8, BT19-089).
      if (action.grant === "immuneToOpponentOptionEffects") {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "beAffected", grantDuration, { fromSourceKind: ["Option"] });
        return false;
      }
      // "isn't affected by the effects of your opponent's Digimon" (BT16-063). This is narrower
      // than blanket opponent-effect immunity; opponent Option/Tamer effects are still relevant.
      if (action.grant === "immuneToOpponentDigimonEffects") {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "beAffected", grantDuration, { fromSourceKind: ["Digimon"] });
        return false;
      }
      // "immuneToOpponentEffects" (BT20-019 stringly, LM-020) — blanket opponent-effect immunity.
      if (action.grant === "immuneToOpponentEffects") {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "beAffected", grantDuration);
        return false;
      }
      // "attackImmunity" (BT5-030, P-051): "This Digimon can't be attacked" — the already
      // enforced `cantBeAttacked` restriction.
      if (action.grant === "attackImmunity") {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "cantBeAttacked", grantDuration);
        return false;
      }
      // "unblockable" (BT4-035, ST8-09): the already enforced `cantBeBlocked` restriction.
      if (action.grant === "unblockable") {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "cantBeBlocked", grantDuration);
        return false;
      }
      // "dpReductionImmunity" (BT11-069): "can't have its DP reduced by your opponent's
      // effects" — dpImmune scoped to the opponent. An optional "DeDigivolveImmunity" token
      // layers on the (unscoped, per the printed "isn't affected by <De-Digivolve> effects")
      // cantBeDeDigivolved restriction, same as the equivalent Protection.protections entry.
      if (action.grant === "dpReductionImmunity") {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "dpImmune", grantDuration, { byOpponentEffectsOnly: true });
        if ((action.tokens ?? []).includes("DeDigivolveImmunity")) {
          for (const id of ids) ctx.fx.restrict(id, "cantBeDeDigivolved", grantDuration);
        }
        return false;
      }
      // "immuneToOpponentDPReductionAndReturn" (BT10-068, BT22-059): "your opponent's effects
      // can't reduce this Digimon's DP or return it to hands or decks" — dpImmune + beReturned,
      // both scoped to the opponent.
      if (action.grant === "immuneToOpponentDPReductionAndReturn") {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) {
          ctx.fx.restrict(id, "dpImmune", grantDuration, { byOpponentEffectsOnly: true });
          ctx.fx.restrict(id, "beReturned", grantDuration, { byOpponentEffectsOnly: true });
        }
        return false;
      }
      // "cantLeaveExceptByOwnerOrDeletion" (BT16-051): "can't leave the battle area other than
      // by deletion" — unscoped bounce protection, the already enforced `beReturned` restriction.
      if (action.grant === "cantLeaveExceptByOwnerOrDeletion") {
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const id of ids) ctx.fx.restrict(id, "beReturned", grantDuration);
        return false;
      }
      // "canBeAttackedWhileUnsuspended" (BT21-096) — the compiler's alternate label for the SAME
      // "may also attack unsuspended Digimon" grant the dedicated `GrantCanAttackUnsuspended`
      // action installs via `grantCanAttackUnsuspended`.
      if (action.grant === "canBeAttackedWhileUnsuspended") {
        const grantDuration = toDuration(action.duration ?? "forTheTurn");
        for (const id of ids) ctx.fx.grantCanAttackUnsuspended(id, grantDuration, {});
        return false;
      }
      // "addName" (P-072, P-073): "treat this card/Digimon as if its name is also [X]" — the
      // same alias mechanism the dedicated "name" grant above uses.
      if (action.grant === "addName") {
        const tokens = action.tokens ?? [];
        if (tokens.length === 0) {
          unsupported(ctx, action, "GrantStatic addName with no tokens");
          return false;
        }
        for (const id of ids) ctx.fx.grantNameTrait(id, "name", tokens, duration);
        return false;
      }
      // "noSecurityOptionEffects" (BT17-014, BT7-014, ST13-05): the printed [Security] text on
      // Option cards the source Digimon checks doesn't activate — the same WarGreymon-shaped
      // ability `disableSecurityEffect` was built for.
      if (action.grant === "noSecurityOptionEffects") {
        const grantDuration = toDuration(action.duration ?? "permanent");
        for (const id of ids) ctx.fx.disableSecurityEffect(id, "option", grantDuration);
        return false;
      }
      // "suppressOnPlayEffects" (BT10-083, EX5-060): "[On Play] effects on Digimon played by
      // this effect don't activate" — the target the compiler emits is `isSelfRef` (the SOURCE
      // card), but the ability's actual subject is the permanent the PRECEDING PlayWithoutCost
      // action just played (the DelayedDelete action a few cases up resolves the identical
      // "the permanent this effect just played" reference the same way).
      if (action.grant === "suppressOnPlayEffects") {
        const grantDuration = toDuration(action.duration ?? "permanent");
        for (const id of ctx.lastPlayedPermanentIds ?? []) {
          ctx.fx.disableTimingEffect(id, ["onPlay"], grantDuration);
        }
        return false;
      }
      if (action.grant === "hasAllDigivolutionColors") {
        const grantDuration = toDuration(action.duration ?? "permanent");
        for (const id of ids) {
          const permanent = ctx.game.permanentById(id);
          if (permanent === undefined) continue;
          const colors = new Set<CardColor>();
          for (const card of permanent.stack) {
            for (const color of ctx.game.definitionOf(card).colors) colors.add(color);
          }
          for (const color of colors) ctx.fx.addColorGrant(id, color, grantDuration);
        }
        return false;
      }
      // "protection" (BT24-055, EX7-041, ST13-14) — the string-grant sibling of the object-shaped
      // Protection above, using its own (opponent-scoped) token vocabulary.
      if (action.grant === "protection") {
        const tokens = action.tokens ?? [];
        const grantDuration = toDuration(action.duration ?? "untilOpponentTurnEnd");
        for (const token of tokens) {
          const mapped = PROTECTION_STRING_TOKEN_MAP[token];
          if (mapped === undefined) {
            unsupported(ctx, action, `GrantStatic protection with unknown token "${token}"`);
            continue;
          }
          for (const id of ids) ctx.fx.restrict(id, mapped, grantDuration, { byOpponentEffectsOnly: true });
        }
        return false;
      }
      // String grants with no enforcement path yet (would need a new subsystem — DNA-digivolve
      // level overrides, attacking a Digimon directly, DigiXros-from-trash, an alternate-color
      // rules layer, etc.), not just a missing primitive wire-up. Failing loudly here — instead
      // of the old silent `grantCustom` store — surfaces them the moment a game actually
      // resolves one.
      if (typeof action.grant === "string") {
        unsupported(ctx, action, `GrantStatic string grant "${action.grant}" has no enforcement path yet`);
        return false;
      }
      // "gains all effects of cards with [X] in its/your digivolution cards" —
      // register stack-card effect conferrals on the continuous ledger (recomputed
      // each static pass; collected at every triggered timing).
      if (!action.filter) {
        unsupported(ctx, action, "GrantStatic effects with no source filter");
        return false;
      }
      for (const permanentId of ids) {
        const permanent = ctx.game.permanentById(permanentId);
        if (permanent === undefined) continue;
        for (const stackCard of permanent.stack) {
          const def = ctx.game.definitionOf(stackCard);
          if (!definitionMatches(action.filter, def as DefinitionFacts)) continue;
          ctx.fx.conferStackEffects(permanentId, stackCard.instanceId, duration);
        }
      }
      return false;
    }
    case "GrantImmunity": {
      // "not affected by opponent's effects while condition holds" (CAP-C-06, BT19-101).
      // Stored as an unconditional beAffected restriction; the condition gate on the
      // containing effect already prevents this from firing when the condition is false.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.restrict(id, "beAffected", duration);
      return false;
    }
    case "WaiveColorRequirement": {
      // Defaults to the source card (the common "use this card without meeting its
      // color requirements"). A filtered target (a referenced card) is rarer.
      const duration = toDuration("forTheTurn");
      if (action.target && !(action.target?.isSelf || action.target?.filter?.isSelfRef)) {
        unsupported(ctx, action, "WaiveColorRequirement on a non-self target needs a card selection");
        return false;
      }
      ctx.fx.waiveColorRequirement(ctx.source.instanceId, duration);
      return false;
    }
    case "ModifySecurityDP": {
      const delta = scale === undefined ? action.amount : action.amount * scale;
      const seat = action.controller === "opponent" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
      ctx.fx.modifySecurityDp(seat, delta);
      return false;
    }
    case "DeletionMaxDpModifier": {
      // Producer side of the DP-deletion-maximum subsystem: record a continuous bonus the
      // Delete branch reads. Self-scoped to this source permanent, or owner-wide by seat.
      if (action.scope === "self") {
        const self = ctx.source.permanent();
        if (self !== undefined) ctx.fx.addDeletionMaxDp?.({ permanentId: self.permanentId }, action.amount);
      } else {
        ctx.fx.addDeletionMaxDp?.({ seat: ctx.source.ownerSeat }, action.amount);
      }
      return false;
    }
    case "CostModifier": {
      // Cost modification recorded in the cost-calculation layer (the play/digivolve cost
      // calc consults it). A scaled DELTA multiplies by the runtime count when known.
      // A SET mode records an absolute base cost (setFixed) computed BEFORE additive
      // deltas (KB BT7-040 Q1568): the SET value is the base, other reductions subtract
      // from it. The SET amount is the literal `amount` (e.g. P-116's 0) or the resolved
      // count when count-driven (BT7-040/BT7-100's security stack).
      const setMode = action.mode === "set";
      if (action.costType === "dpDeletion") {
        const amount =
          (scale === undefined ? action.amount : action.amount * scale) * (action.mode === "reduce" ? -1 : 1);
        const self = action.target?.isSelf || action.target?.filter?.isSelfRef ? ctx.source.permanent() : undefined;
        if (self !== undefined) {
          ctx.fx.addDeletionMaxDp?.({ permanentId: self.permanentId }, amount);
        } else {
          // EX2-010 Q3293 and EX2-011 Q3297: without a self target, the printed
          // maximum modifier applies to every DP-based deletion effect of the owner.
          ctx.fx.addDeletionMaxDp?.({ seat: ctx.source.ownerSeat }, amount);
        }
        return false;
      }
      const want = action.target;
      if (!want) {
        if (
          action.costType === "digivolve" &&
          action.mode === "reduce" &&
          action.duration === "nextDigivolveThisTurn" &&
          action.cost?.kind === "trash"
        ) {
          const ownerSeat = ctx.source.ownerSeat;
          ctx.fx.subscribeReplacement({
            event: "wouldDigivolve",
            mode: "reduceCost",
            amount: Math.abs(action.amount),
            controllerSeat: ownerSeat,
            activationContext: ctx,
            consumeOnActivate: true,
            expiresOnTurnEndOf: ownerSeat,
            description: action.raw ?? `Reduce the next digivolution cost by ${Math.abs(action.amount)}`,
            activate: async (runtimeCtx, target, _into, evolvingInstanceId) => {
              if (target.controllerSeat !== ownerSeat || target.inBreeding) return false;
              const colors = new Set(runtimeCtx.game.definitionOf(target.topCard).colors);
              const candidates = runtimeCtx.game.player(ownerSeat).hand.filter((card) => {
                if (card.instanceId === evolvingInstanceId) return false;
                const definition = runtimeCtx.game.definitionOf(card);
                return (
                  definition.kinds.includes(CardKind.Digimon) && definition.colors.some((color) => colors.has(color))
                );
              });
              if (candidates.length === 0) return false;
              if (!(await runtimeCtx.ask.optional(runtimeCtx, action.cost?.raw ?? "Pay the reduction cost?")))
                return false;
              const chosen = await runtimeCtx.ask.selectCards(runtimeCtx, {
                candidates: candidates.map((card) => card.instanceId),
                min: 1,
                max: 1,
              });
              if (chosen.length !== 1) return false;
              const trashed = await runtimeCtx.fx.trash(chosen, { byEffectSeat: ownerSeat });
              return trashed.length === 1;
            },
          });
        }
        return false;
      }
      const filter = want.filter ?? {};
      let delta = action.amount;
      if (setMode) {
        delta = scale !== undefined ? scale : action.amount;
      } else if (action.scaled && action.scaling === undefined) {
        const countFilter = { ...filter, controller: filter.controller ?? "mine" };
        delta = action.amount * countMatching(ctx, countFilter);
      } else if (scale !== undefined) {
        delta = action.amount * scale;
      }
      if (!setMode && action.mode === "reduce") {
        delta = -Math.abs(delta);
      }
      const modifierOpts:
        | {
            setFixed?: boolean;
            once?: boolean;
            onConsume?: (match: { target: Permanent; into?: CardDefinition }) => void;
          }
        | undefined =
        setMode || action.once === true || action.onConsume !== undefined || action.restriction === "suspendThisTamer"
          ? {
              ...(setMode ? { setFixed: true } : {}),
              ...(action.once === true || action.restriction === "suspendThisTamer" ? { once: true } : {}),
            }
          : undefined;
      const selfRef = want.isSelf || filter.isSelfRef;
      // A hand-resident digivolve-cost static (BT7-040) installs ONLY while its source
      // `card.Owner.HandCards.Contains(card)`) — the candidate sweep also visits trash
      // and face-up security, which must not arm the SET.
      if (action.handResident === true) {
        const inHand = ctx.game.player(ctx.source.ownerSeat).hand.some((c) => c.instanceId === ctx.source.instanceId);
        if (!inHand) return false;
      }
      if (action.costType === "digivolve") {
        // Digivolve-cost form: the predicate matches the base battle-area permanent being
        // digivolved, plus (when known) the card being digivolved INTO (`m.into`). The
        // digivolve flow reads it via changeEvoCost at cost-query time.
        //
        // A `selfRef` target has two distinct shapes, distinguished by where the source
        // currently lives:
        //   - HAND-RESIDENT (BT7-040 "when digivolving INTO this card from your hand"):
        //     the source is the digivolution TARGET sitting in hand, so it has no
        //     permanent. Match the digivolve whose `into` card IS this source card.
        //   - ON-FIELD self (a permanent's own "reduce my digivolve cost"): match the
        //     permanent that contains this source.
        const selfCardId = ctx.source.cardId;
        const predicate = (m: { target: Permanent; into?: CardDefinition }): boolean => {
          if (action.restriction === "suspendThisTamer") {
            const tamer = ctx.source.permanent();
            if (tamer === undefined || tamer.isSuspended || tamer.inBreeding) return false;
          }
          if (selfRef) {
            const self = ctx.source.permanent();
            if (self === undefined) {
              // Hand-resident target: the digivolve must be INTO this card AND driven by
              // the owner's own digivolve onto a permanent the owner controls (documented behavior
              // battle area). Requiring a known, matching `into` removes the latent
              // over-match where an unknown `into` clobbered unrelated digivolves; the live
              // digivolve site always supplies `into`. Without the owner-seat gate, one
              // player's installed hand-resident SET cost would corrupt the OTHER player's
              // digivolve into the same card id (CR-01).
              if (m.into === undefined || m.into.cardId !== selfCardId) return false;
              if (m.target.controllerSeat !== ctx.source.ownerSeat) return false;
              // Some hand-resident reducers constrain the BASE as well as the destination.
              // BT3-031, for example, reduces only when the Digimon being evolved is
              // Paildramon/Dinobeemon. Its sourceFilter also gates effect installation, but
              // that broad board-presence check alone would incorrectly let an unrelated
              // level 5 receive the discount while a matching Digimon sat beside it.
              if (
                action.sourceFilter !== undefined &&
                !permanentMatchesFilter(ctx, m.target, action.sourceFilter, ctx.source)
              ) {
                return false;
              }
              return true;
            }
            if (self.permanentId !== m.target.permanentId) return false;
            if (action.into !== undefined) {
              if (m.into === undefined) return false;
              if (!definitionMatches(action.into, m.into as unknown as DefinitionFacts)) return false;
            }
            return true;
          }
          // `action.into` scopes the reduction to only those digivolves whose destination card
          // (the card being digivolved into, still in hand) matches the filter (CAP-C-10,
          // BT2-088: "when digivolving a battle-area Digimon INTO a Tyrannomon-named card").
          // When `m.into` is absent (cost query without a known destination), conservatively
          // decline the reduction — the live digivolve site always supplies it.
          if (action.into !== undefined) {
            if (m.into === undefined) return false;
            if (!definitionMatches(action.into, m.into as unknown as DefinitionFacts)) return false;
          }
          return permanentMatchesFilter(ctx, m.target, filter, ctx.source);
        };
        if (modifierOpts !== undefined && action.restriction === "suspendThisTamer") {
          modifierOpts.onConsume = () => {
            const tamer = ctx.source.permanent();
            if (tamer !== undefined) ctx.fx.payActivationCost?.(tamer.permanentId, "suspend");
          };
        }
        if (modifierOpts !== undefined && action.onConsume !== undefined) {
          modifierOpts.onConsume = (match) => {
            const bindAs = action.consumeBindAs ?? "consumedCostTarget";
            ctx.fx.subscribeSubTrigger({
              event: "endOfTurn",
              sourcePermanentId: match.target.permanentId,
              once: true,
              description: action.raw ?? "cost modifier consumed",
              run: async (subCtx) => {
                const selections = new Map(subCtx.selections ?? []);
                selections.set(bindAs, match.target.permanentId);
                const runCtx: EffectContext = { ...subCtx, selections };
                for (const a of action.onConsume ?? []) {
                  const abort = await runAction(runCtx, a);
                  if (abort) break;
                }
              },
            });
          };
        }
        ctx.fx.changeEvoCost(predicate, delta, modifierOpts);
        return false;
      }
      // Play/use-cost form ("reduce the play cost of your Digimon by N", "increase the
      // cost of your opponent's next Digimon by N"): the predicate matches card
      // DEFINITIONS (and the paying seat) rather than a board permanent, since the
      // affected card is still in hand when its cost is computed. The self form (this
      // card's own play/use cost) matches this source instance's card id for its owner.
      const seatsScope = seatsForController(ctx, filter);
      const selfCardId = ctx.source.cardId;
      const predicate = (facts: { def: CardDefinition; controllerSeat: Seat }): boolean => {
        if (!seatsScope.includes(facts.controllerSeat)) return false;
        if (selfRef) {
          return facts.controllerSeat === ctx.source.ownerSeat && facts.def.cardId === selfCardId;
        }
        return definitionMatches(filter, facts.def as unknown as DefinitionFacts);
      };
      ctx.fx.changePlayCost(predicate, delta, setMode ? { setFixed: true } : undefined);
      return false;
    }
    case "SecurityManipulation": {
      await runSecurityManipulation(ctx, action);
      return false;
    }
    case "RecoverByTrashingMostSecurity": {
      await runRecoverByTrashingMostSecurity(ctx, action);
      return false;
    }
    case "trashSecurityTop": {
      // "Trash the top N card(s) of <controller>'s security stack" as a standalone action
      // (not a cost). Used inside SubTrigger.actions to trash the opponent's top security
      // as part of a triggered effect body (CAP-E15, BT21-052 Examon X Antibody).
      const mine = ctx.source.ownerSeat;
      const opp = ctx.game.opponentOf(mine);
      const seat = action.controller === "opponent" ? opp : mine;
      const count = action.count ?? 1;
      if (ctx.game.player(seat).security.length > 0) {
        await ctx.fx.trashFromSecurity(seat, count, { fromTop: true });
      }
      return false;
    }
    case "PlayToken": {
      // Accept both the `tokens[]`/`count` and the singular `token`/`amount` field conventions —
      // a card written with the singular form was otherwise silently inert (EX11-012, BT21-029).
      const tokenNames = action.tokens ?? (action.token !== undefined ? [action.token] : []);
      const rawCount = action.count ?? action.amount ?? 1;
      const count = scale === undefined ? rawCount : rawCount * scale;
      // `placedAs: "opponentDigimon"` places the token under the OPPONENT's control even though this
      // effect's controller activates it (KB Q5800). Otherwise it enters under the source's seat.
      const placementSeat =
        action.placedAs === "opponentDigimon" ? ctx.game.opponentOf(ctx.source.ownerSeat) : ctx.source.ownerSeat;
      for (let i = 0; i < count; i++) {
        for (const tokenName of tokenNames) {
          await ctx.fx.playToken(placementSeat, tokenName, {
            payCost: action.payCost ?? false,
            suspended: action.suspended ?? false,
          });
        }
      }
      return false;
    }
    case "Modal": {
      await runModal(ctx, action);
      return false;
    }
    case "ConditionalBranch": {
      const branch = evaluateCondition(ctx, action.condition) ? action.ifTrue : (action.ifFalse ?? []);
      for (const nested of branch) {
        const abort = await runAction(ctx, nested);
        if (abort) break;
      }
      return false;
    }
    case "DelayedEffect": {
      const self = ctx.source.permanent();
      if (self === undefined) return false;
      ctx.fx.subscribeSubTrigger({
        event: "endOfTurn",
        sourcePermanentId: self.permanentId,
        once: true,
        expiresOnTurnEndOf: ctx.game.opponentOf(ctx.source.ownerSeat),
        matches: (subCtx) => !subCtx.source.isOwnersTurn(),
        description: action.raw ?? "DelayedEffect(nextEndOfOpponentTurn)",
        run: async (subCtx) => {
          await runAction(subCtx, action.effect);
        },
      });
      return false;
    }
    case "SubTrigger": {
      await runSubTrigger(ctx, action);
      return false;
    }
    case "Replacement": {
      await runReplacement(ctx, action);
      return false;
    }
    case "Prevent": {
      await runPrevent(ctx, action);
      return false;
    }
    case "RedirectAttack": {
      // "Change the target of the attack to 1 of your Digimon": resolve the candidate
      // permanents from the filter and let the CHOOSER pick which becomes the new attack
      // target. `chooser` defaults to "controller" (the source's controller); BT4-075 sets
      // "opponent" so the DEFENDING player chooses among their own unsuspended Digimon, and
      // `optional` lets them decline. A no-op when no attack is open (combat guards it).
      if (action.chooser === "opponent") {
        // The DEFENDING player picks among THEIR OWN matching Digimon — enumerate the
        // candidates (scoped to the opponent/defender seat; the recognizer may strip the
        // controller predicate when the activation gate already credits it) without prompting
        // the controller; the primitive prompts the opponent. Optional => may decline.
        const candidateSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
        const scopedTarget = { ...action.target, filter: { ...action.target.filter, controller: "opponent" as const } };
        const ids = candidatePermanents(ctx, scopedTarget).map((p) => p.permanentId);
        await ctx.fx.redirectAttack(ids, { chooserSeat: candidateSeat, optional: action.optional ?? false });
        return false;
      }
      const ids = await resolvePermanentTargets(ctx, action.target);
      await ctx.fx.redirectAttack(ids, { optional: action.optional ?? false });
      return false;
    }
    case "SelectBind": {
      // Resolve the binding target and record the chosen permanentId under its handle for a
      // later action's relativeTo / fromSelectionRef / underSelectionRef to reference. No other
      // effect. When nothing is chosen the handle stays unset and dependents resolve to nothing.
      const name = action.target.bindAs;
      if (name === undefined) return false;
      const target = action.chooser === undefined ? action.target : { ...action.target, chooser: action.chooser };
      const ids = await resolvePermanentTargets(ctx, target);
      if (ids.length > 0 && ctx.selections) ctx.selections.set(name, ids[0]!);
      return false;
    }
    case "DeDigivolve": {
      // Dynamic amount: "＜De-Digivolve 1＞ for each of this Digimon's face-down digivolution
      // cards" (EX9-043). placeUnder marks effect-placed cards face-down, so the count is the
      // source permanent's face-down stack cards at resolution time.
      const amount =
        typeof action.amount === "number"
          ? action.amount
          : (ctx.source.permanent()?.stack.filter((c) => !c.faceUp).length ?? 0);
      // A scaling on DeDigivolve is a repetition count, not one larger peel. BT21-061 Q4568:
      // four Tamer colors perform De-Digivolve 1 twice, with state checked between peels.
      const repeat = scale ?? 1;
      for (let i = 0; i < repeat; i++) {
        const ids = await resolvePermanentTargets(ctx, action.target);
        // The trashing effect's seat gates EX11-070's stacked-trash-lock (KB Q5943).
        for (const id of ids)
          ctx.fx.deDigivolve(id, amount, { byEffectSeat: ctx.source.ownerSeat, stopAtLevel: action.stopAtLevel });
      }
      return false;
    }
    case "Digivolve": {
      // A Static Tamer-onto declaration is legality metadata, not an effect-driven
      // digivolution to execute. Historical IR spells it as target+asIf; current IR uses
      // onto+asLevel. Both intentionally omit `into` because the evolving card is THIS card
      // in the player's hand. Recomputing static effects must therefore leave it inert.
      const metadata = action as typeof action & {
        onto?: unknown;
        asLevel?: number;
        asIf?: { level?: number };
      };
      if (
        action.into === undefined &&
        (metadata.onto !== undefined || metadata.asLevel !== undefined || metadata.asIf !== undefined)
      ) {
        return false;
      }
      await runDigivolve(ctx, action);
      return false;
    }
    case "DnaDigivolve": {
      await runDnaDigivolve(ctx, action);
      return false;
    }
    case "PlayPerLevel": {
      await runPlayPerLevel(ctx, action);
      return false;
    }
    case "AppFuse": {
      await runAppFuse(ctx, action);
      return false;
    }
    case "PlaceUnder": {
      await runPlaceUnder(ctx, action);
      return false;
    }
    case "TrashDigivolution": {
      const completed = await runTrashDigivolution(ctx, {
        ...action,
        amount: action.amount === "all" ? "all" : (action.amount ?? 1) * (scale ?? 1),
      });
      return action.optional === true && action.abortOnDecline === true && !completed;
    }
    case "Link": {
      await runLink(ctx, action);
      return false;
    }
    case "GrantLinkCostReduction": {
      // Install a recipient-scoped continuous link-cost reduction (documented behavior rule implementation,
      // documented behavior). The recipient defaults to the source permanent ("to this Digimon");
      // when an explicit target is given it resolves to the chosen friendly Digimon. runLink reads
      // the recipient's grant when a `whenLinkingTrait` card would link to it.
      const ids = await resolvePermanentTargets(ctx, action.target);
      const duration = toDuration(action.duration);
      for (const id of ids) ctx.fx.grantLinkCostReduction(id, action.amount, action.whenLinkingTrait, duration);
      return false;
    }
    case "CannotIgnoreDigivolutionRequirements": {
      // Seat-level "players can't ignore digivolution requirements" (documented behavior
      // rule implementation, documented behavior). Affects BOTH seats (KB Q1738). The
      // normal digivolve color-waiver and effect-driven ignore-requirements paths both consult
      // this flag (KB Q1741-Q1742).
      const duration = toDuration(action.duration);
      ctx.fx.cannotIgnoreDigivolution(0, duration);
      ctx.fx.cannotIgnoreDigivolution(1, duration);
      return false;
    }
    case "MindLink": {
      await runMindLink(ctx, action);
      return false;
    }
    case "ActivateMain": {
      // Some IR records carry declarative metadata for custom turn-end rules under the
      // legacy ActivateMain shape so older audit tooling can see a non-empty action.
      // This is not the security "activate this card's [Main] effect" operation, so it
      // must not call runActivateMain or emit a loud missing-[Main] gap.
      if ((action as any).turnEndCondition !== undefined) return false;
      await runActivateMain(ctx);
      return false;
    }
    case "ActivateOptionMain": {
      const count = Math.max(1, action.count ?? 1);
      for (let i = 0; i < count; i++) await runActivateMain(ctx);
      return false;
    }
    case "Attack": {
      // "This Digimon attacks" (self) or "1 of your Digimon attacks" (targeted): make
      // the resolved permanent(s) declare an attack. The controller chooses each
      // attack's target (player / suspended enemy Digimon) inside the combat verb.
      // `withoutSuspending` declares the attack without tapping the attacker.
      const attackSubject = action.attacker ?? action.subject ?? action.target;
      if (attackSubject === undefined) return false;
      let suspensionTriggersFired = false;
      const fireDeferredSuspensionTriggers = async (): Promise<void> => {
        if (suspensionTriggersFired || deferredCostSuspensions.length === 0) return;
        suspensionTriggersFired = true;
        await ctx.fx.fireSuspensionTriggers?.(deferredCostSuspensions, { byEffectSeat: ctx.source.ownerSeat });
      };
      if (action.drainTimingWindowDuringAttack && ctx.fx.isAttackResolving?.()) {
        await fireDeferredSuspensionTriggers();
        return false;
      }
      const opts = {
        withoutSuspending: action.withoutSuspending ?? false,
        attackPlayer: action.attackPlayer,
        afterAttackTriggers: fireDeferredSuspensionTriggers,
        drainTimingWindow: action.drainTimingWindowDuringAttack ? ctx.drainCurrentTimingWindow : undefined,
      };
      if (attackSubject.isSelf || attackSubject.filter?.isSelfRef) {
        const self = ctx.source.permanent();
        if (self !== undefined) await ctx.fx.forceAttack(self.permanentId, opts);
        await fireDeferredSuspensionTriggers();
        return false;
      }
      const ids = await resolvePermanentTargets(ctx, attackSubject);
      for (const id of ids) await ctx.fx.forceAttack(id, opts);
      await fireDeferredSuspensionTriggers();
      return false;
    }
    case "Battle": {
      // Direct battle ("1 of your Digimon may battle 1 of your opponent's Digimon"): resolve
      // an attacker (self or chosen) and a defender (chosen opponent Digimon), then run a §14
      // DP battle. Optional => the controller may decline either pick.
      let attackerId: string | undefined;
      if (action.attacker.isSelf || action.attacker.filter.isSelfRef) {
        attackerId = ctx.source.permanent()?.permanentId;
      } else {
        attackerId = (await resolvePermanentTargets(ctx, action.attacker))[0];
      }
      if (attackerId === undefined) return false;
      // The compiler emits the defender as either `defender` or the alternative `target`
      // (BattleAction allows both); honor whichever is present.
      const defenderTarget = action.defender ?? action.target;
      if (defenderTarget === undefined) return false;
      const defenderId = (await resolvePermanentTargets(ctx, defenderTarget))[0];
      if (defenderId === undefined) return false;
      await ctx.fx.forceBattle?.(attackerId, defenderId);
      return false;
    }
    case "RestrictMemoryGain": {
      const seats = seatsForController(ctx, { controller: action.seat });
      const duration = toDuration(action.duration);
      for (const seat of seats) ctx.fx.restrictMemoryGain(seat, duration);
      return false;
    }
    case "RestrictCostReduction": {
      const seats = seatsForController(ctx, { controller: action.seat });
      const duration = toDuration(action.duration);
      for (const seat of seats) ctx.fx.restrictCostReduction(seat, action.costType, duration);
      return false;
    }
    case "RestrictPlay": {
      // Seat-level "can't play/move <X>" prohibition. The restricted seat is the source's
      // opponent (action.seat === "opponent"); resolve it via the same seat-scoping helper.
      // The IR Filter narrows to a serializable PlayMatch (kind + DP cap) — the only forms the
      // source CardCondition uses (IsOption / IsDigimon + CardDP <= N).
      const seats = seatsForController(ctx, { controller: action.seat });
      const duration = toDuration(action.duration);
      const match = {
        ...(action.filter.kind ? { kinds: action.filter.kind } : {}),
        ...(action.filter.dpAtMost !== undefined ? { dpAtMost: action.filter.dpAtMost } : {}),
      };
      for (const seat of seats)
        ctx.fx.restrictPlay(seat, ctx.source.ownerSeat, match, action.mode, duration, action.byEffectOnly);
      return false;
    }
    case "GlobalRestrict": {
      if (action.restriction === "opponentCannotAddToSecurity") {
        ctx.fx.restrictSecurityAddsFromEffect?.(
          ctx.game.opponentOf(ctx.source.ownerSeat),
          ctx.source.ownerSeat,
          toDuration(action.duration),
        );
      }
      return false;
    }
    case "WinGame": {
      const winner = action.winner === "controller" ? ctx.source.ownerSeat : ctx.game.opponentOf(ctx.source.ownerSeat);
      ctx.fx.declareWinner(winner);
      return false;
    }
    case "ReactivateEffect": {
      const compiled = runtimeCompiledCard(ctx.source.cardId);
      if (!compiled) return false;
      const factor = action.scaling ? scaleFactor(ctx, action.scaling) : 1;
      const reps = action.count * factor;
      const toRun = compiled.effects.filter((e) => e.trigger === action.fromTrigger).slice(0, action.count);
      for (let i = 0; i < reps; i++) {
        for (const eff of toRun) await runEffect(ctx, eff);
      }
      return false;
    }
    case "ActivateForeignEffect":
      await runActivateForeignEffect(ctx, action);
      return false;
    case "ActivateEffect":
      await runActivateEffect(ctx, action);
      return false;
    case "UseOptionWithoutCost":
      await runUseOptionWithoutCost(ctx, action);
      return false;
    case "RawUnparsed":
      unsupported(ctx, action, `unparsed clause: "${action.text}"`);
      return false;
    case "AllowDigiXrosMaterialsFromTrash":
      // Declarative marker consumed statically by the DigiXros validator — no runtime action.
      return false;
    case "GainTriggeredEffect": {
      await runGainTriggeredEffect(ctx, action);
      return false;
    }
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
