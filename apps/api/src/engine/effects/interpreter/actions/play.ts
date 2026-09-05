// Playing cards from hand, deck, trash, and security.

import type { EffectContext } from "../../EffectContext.js";
import { requireOpponentAsk } from "../../../decisions/decisionApi.js";
import { evaluateCondition } from "../conditions.js";
import type { ActionScope } from "../dispatch.js";
import { definitionMatches } from "../matching/definition.js";
import { permanentMatchesFilter, seatsForController } from "../matching/permanent.js";
import { countMatching, scaleFactor } from "../scaling.js";
import { DEFAULT_PLAY_ZONES, candidateLooseInstances, looseCardsInZone, pickLoose } from "../targeting/loose.js";
import { runPlayPerLevel } from "./dna.js";
import { CardKind, digiXrosRequirementFor, effectiveStaticNames } from "@aegis/shared";
import type { Action, Scaling, Seat, Target } from "@aegis/shared";
import { materialsSatisfyRecipe } from "../../../actions/digiXros.js";
import { digiXrosZoneExpanderFor } from "../../../digiXros/zoneExpanders.js";

/**
 * The card kinds a play target explicitly asks for, across its filter and every alternative.
 * Empty means the IR named no kind at all.
 */
function requestedPlayKinds(target: Target | undefined): string[] {
  if (target === undefined) return [];
  const filters = [target.filter, ...(target.orFilters ?? []), ...(target.filter?.orFilters ?? [])];
  return filters.flatMap((filter) => filter?.kind ?? []);
}

/**
 * Drop Option-only cards from a play candidate pool whose IR named no card kind.
 *
 * Only Digimon and Tamers are ever PLAYED; an Option card is USED (comprehensive rules
 * §6-4 vs §6-5), and no printed card says "play N ... Option card". A kind-less filter such
 * as BT21-098's "play 1 card with [Vemmon] in its text and a play cost of 6 or less"
 * therefore means Digimon and Tamers, but matched Options too because `kind` was the only
 * thing excluding them.
 *
 * An IR that genuinely means "use an Option" says so with `kind: ["Option"]`, which is the
 * same signal the play-vs-use split further down already reads — so naming Option keeps the
 * card in the pool, and a DUAL Digimon/Option is never dropped because it has a playable side.
 */
function playableCandidates<T extends { cardId: string }>(
  ctx: EffectContext,
  target: Target | undefined,
  candidates: readonly T[],
): T[] {
  if (requestedPlayKinds(target).length > 0) return [...candidates];
  return candidates.filter((candidate) => {
    const kinds = ctx.game.definitionOf({ cardId: candidate.cardId } as never).kinds;
    if (!kinds.includes(CardKind.Option)) return true;
    return kinds.includes(CardKind.Digimon) || kinds.includes(CardKind.Tamer);
  });
}

export function playCostScalingDelta(scaling: Scaling, factor: number): number {
  if (scaling.subtract !== undefined) return -scaling.subtract * factor;
  if (scaling.bonus !== undefined) return scaling.bonus * factor;
  return factor;
}

/**
 * Materialize a dynamic level ceiling before matching loose cards.
 *
 * Permanent matching evaluates `levelComparison.scaling` against live permanents,
 * but loose-card matching delegates to `definitionMatches`, which intentionally only
 * understands static filters. Play effects therefore need to turn the dynamic ceiling
 * into a static value before resolving hand/trash candidates (EX9-054).
 */
export function materializeLevelComparisonScaling(target: Target, factor: number): Target {
  const comparison = target.filter.levelComparison;
  if (comparison?.value === undefined || comparison.scaling === undefined) return target;
  const { scaling: _scaling, ...staticComparison } = comparison;
  return {
    ...target,
    filter: {
      ...target.filter,
      levelComparison: {
        ...staticComparison,
        value: comparison.value + factor,
      },
    },
  };
}

function paidReduction(ctx: EffectContext, action: Extract<Action, { kind: "PlayWithoutCost" }>): number | undefined {
  const base = action.reduceCostBy;
  const scaling = action.reduceCostByScaling === undefined ? 0 : scaleFactor(ctx, action.reduceCostByScaling);
  const conditional = (
    action as typeof action & { reduceCostByIf?: { amount: number; condition: import("@aegis/shared").Condition } }
  ).reduceCostByIf;
  if (base === undefined && action.reduceCostByScaling === undefined && conditional === undefined) return undefined;
  return (
    (base ?? 0) +
    scaling +
    (conditional !== undefined && evaluateCondition(ctx, conditional.condition) ? conditional.amount : 0)
  );
}

/**
 * ＜Decode＞ plays from "that Digimon's digivolution cards" (CR 16-36-1). A Decode play whose
 * target names no host scope would otherwise pool every digivolution card the controller owns,
 * so scope it to the resolving source permanent unless the IR already scopes the host.
 */
export function applyDecodeHostScope(action: Extract<Action, { kind: "PlayWithoutCost" }>, target: Target): Target {
  const zones = action.from && action.from.length > 0 ? action.from : DEFAULT_PLAY_ZONES;
  const sources = target.source === undefined ? [] : Array.isArray(target.source) ? target.source : [target.source];
  const alreadyScoped =
    target.filter.hostFilter !== undefined ||
    sources.includes("thisDigimon") ||
    action.fromOwnDigivolutionStack === true;
  if (action.playedByDecode !== true || alreadyScoped || !zones.includes("digivolutionCards")) return target;
  return { ...target, filter: { ...target.filter, hostFilter: { isSelfRef: true } } };
}

export function applyPlayCostCeiling(
  ctx: EffectContext,
  action: Extract<Action, { kind: "PlayWithoutCost" }>,
  target: Target,
): Target {
  const ceiling = action.playCostCeiling;
  if (ceiling === undefined) return target;
  const mine = ctx.source.ownerSeat;
  const opp = ctx.game.opponentOf(mine);
  const filter = ceiling.filter;
  const zone = (filter as { zone?: string }).zone;
  const controller = (filter as { controller?: string }).controller;
  const seats: Seat[] =
    controller === "both" || controller === undefined ? [mine, opp] : controller === "opponent" ? [opp] : [mine];
  let totalCards = 0;
  if (ceiling.unit === "digivolutionCards") {
    for (const seat of seats) {
      for (const permanent of ctx.game.player(seat).battleArea) {
        if (permanentMatchesFilter(ctx, permanent, filter, ctx.source)) totalCards += permanent.stack.length;
      }
    }
  } else if (ceiling.unit === "selfFaceDownDigivolutionCards") {
    totalCards = scaleFactor(ctx, { per: 1, filter, unit: ceiling.unit });
  } else if (zone === "trash") {
    for (const seat of seats) totalCards += ctx.game.player(seat).trash.length;
  } else if (ceiling.unit === "cards") {
    totalCards = scaleFactor(ctx, { per: 1, filter, unit: "cards" });
  }
  const computedCeiling = ceiling.base + Math.floor(totalCards / ceiling.per) * ceiling.raise;
  return { ...target, filter: { ...target.filter, playCostLte: computedCeiling } };
}

export async function runPlayAction(ctx: EffectContext, action: Action, scope: ActionScope): Promise<boolean> {
  const { scale } = scope;
  switch (action.kind) {
    case "PlayMultiple": {
      const from = Array.isArray(action.from)
        ? action.from
        : [action.from === "digivolution" ? "digivolutionCards" : action.from];
      const target: Target = { filter: action.filter, count: "all", upTo: true };
      const candidates = playableCandidates(ctx, target, candidateLooseInstances(ctx, target, from));
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
      const budget = action.totalCostScaling
        ? action.totalCostScaling.base +
          Math.floor(countMatching(ctx, action.totalCostScaling.filter) / action.totalCostScaling.per) *
            action.totalCostScaling.raise
        : action.totalCost;
      for (const instanceId of selected) {
        const cand = candidates.find((c) => c.instanceId === instanceId);
        if (cand === undefined) continue;
        const playCost = ctx.game.definitionOf({ cardId: cand.cardId } as never).playCost;
        if (playCost === undefined || usedCost + playCost > budget) continue;
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
      const bindPlayWithoutCost = (playedPermanentIds = ctx.lastPlayedPermanentIds) => {
        // `sameTarget` continuations (for example, "that Digimon gains Rush")
        // consume the common last-resolved target register. A play action is itself
        // a target-producing action, so preserve the actual permanents it created.
        ctx.lastResolvedPermanentIds = playedPermanentIds ?? [];
        if (action.bindResultAs && playedPermanentIds !== undefined) {
          ctx.boundPlayed ??= new Map();
          ctx.boundPlayed.set(action.bindResultAs, new Set(playedPermanentIds));
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
      // A self-reference with an explicit loose-card zone (notably `linked`) scopes the
      // host, it does not mean "play the source card again". The latter is reserved for the
      // targetless/self target forms used by Security and revive clauses.
      const selfPlayTarget =
        action.target?.isSelf ||
        (action.target?.filter?.isSelfRef === true &&
          action.target.filter.zone === undefined &&
          action.from?.includes("digivolutionCards") !== true);
      if (selfPlayTarget) {
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
        // Lightweight card-module seams may provide only the game state and effect verbs;
        // they do not need to model every player zone just to assert that self-play delegates
        // to the correct primitive. In the production engine `player()` is always present,
        // so this fallback only affects those deliberately narrow contexts.
        const owner = ctx.game.player?.(self.ownerSeat);
        const fromSecurity =
          action.from?.includes("security") === true ||
          (ctx.activeTiming === "Security" &&
            owner?.trash !== undefined &&
            !owner.trash.some((card) => card.instanceId === self.instanceId)) ||
          owner?.security?.some((card) => card.instanceId === self.instanceId) === true;
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
          const assemblyTarget = action.assembly?.target;
          const assemblyCandidates =
            assemblyTarget === undefined ? [] : candidateLooseInstances(ctx, assemblyTarget, ["trash"]);
          const selectedAssembly =
            assemblyTarget === undefined
              ? []
              : await pickLoose(ctx, { ...assemblyTarget, upTo: true }, assemblyCandidates, undefined, ctx.ask);
          const assemblyComplete =
            assemblyTarget !== undefined &&
            typeof assemblyTarget.count === "number" &&
            selectedAssembly.length === assemblyTarget.count;
          // A scaled reduction ("with the play cost reduced by the play cost of the returned
          // Tamer" — LM-006) resolves against the live context, which already carries the
          // receipts written while this action's own cost was paid.
          const scaledReduction = paidReduction(ctx, action);
          const played = await ctx.fx.playInstances([self.instanceId], {
            payCost: action.payCost,
            ...(action.breeding === true ? { breeding: true } : {}),
            ...(scaledReduction !== undefined || assemblyComplete
              ? { costDelta: (scaledReduction ?? 0) + (assemblyComplete ? action.assembly!.reduceCostBy : 0) }
              : {}),
            ...(assemblyComplete ? { assemblyMaterialInstanceIds: selectedAssembly } : {}),
            ...(action.suppressOnPlayEffects === true ? { suppressOnPlayEffects: true } : {}),
          });
          ctx.lastPlayedPermanentIds = (played ?? []).map((p) => p.permanentId);
        } else {
          // "Play this card with the play cost reduced by N" (EX10-035): fold the reduction into
          // the play verb when paying. A free play (payCost false) ignores reduceCostBy.
          // This is an effect-driven play, not a bare zone move. Route through the
          // generalized play seam so the card's [On Play] window and `whenPlayed`
          // watchers both fire (the same contract used by filtered plays).
          const selfReduction = paidReduction(ctx, action);
          const played = await ctx.fx.playInstances([self.instanceId], {
            payCost: action.payCost,
            ...(action.breeding === true ? { breeding: true } : {}),
            ...(selfReduction !== undefined ? { costDelta: selfReduction } : {}),
            ...(action.suppressOnPlayEffects === true ? { suppressOnPlayEffects: true } : {}),
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
        const filters = [
          action.target.filter,
          ...(action.target.orFilters ?? []),
          ...(action.target.filter.orFilters ?? []),
        ];
        const matching = playableCandidates(
          ctx,
          action.target,
          self.stack.filter((c) => {
            const definition = ctx.game.definitionOf({ cardId: c.cardId } as never);
            return filters.some((filter) => definitionMatches(filter, definition));
          }),
        );
        if (matching.length === 0) {
          ctx.lastEffectActed = false;
          return false;
        }
        const cap = action.target.count === "all" ? matching.length : Math.min(action.target.count, matching.length);
        // Named own-stack targets need the same exact-name semantics as loose-card targeting.
        // This matters for BT7-063: its On Play target is up-to by name, while its deletion
        // replacement requires both names when both are present (Q1623).
        const requiredNamesExact = action.target.requiredNamesExact ?? [];
        const requiredNamesExactUpTo = action.target.requiredNamesExactUpTo ?? [];
        const namedSelection = (names: string[], requireAll: boolean) => {
          const selected: typeof matching = [];
          const used = new Set<string>();
          for (const requiredName of names) {
            const candidate = matching.find((card) => {
              if (used.has(card.instanceId)) return false;
              const definition = ctx.game.definitionOf({ cardId: card.cardId } as never);
              return definition.nameEn === requiredName;
            });
            if (candidate === undefined) {
              if (requireAll) return [];
              continue;
            }
            used.add(candidate.instanceId);
            selected.push(candidate);
          }
          return selected;
        };
        // A required exact set is all-or-none; an up-to set takes one of each available name.
        // With neither field, preserve the normal mandatory as-many-as-possible selection.
        const selectedNamed =
          requiredNamesExact.length > 0
            ? namedSelection(requiredNamesExact, true)
            : requiredNamesExactUpTo.length > 0
              ? namedSelection(requiredNamesExactUpTo, false)
              : undefined;
        const chosenOwn = (selectedNamed ?? matching.slice(0, cap)).slice(0, cap).map((c) => c.instanceId);
        if (chosenOwn.length > 0) {
          const played = await ctx.fx.playInstances(chosenOwn, {
            payCost: action.payCost,
            ...(action.playedByDecode === true ? { playedByDecode: true } : {}),
            hostPermanentIds: Object.fromEntries(chosenOwn.map((instanceId) => [instanceId, self.permanentId])),
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
      const levelCeilingAdjustedTarget =
        ctx.playLevelCeilingDelta === undefined || ctx.playLevelCeilingDelta === 0
          ? playTarget
          : {
              ...playTarget,
              filter: {
                ...playTarget.filter,
                levelComparison:
                  playTarget.filter.levelComparison?.op === "lte" &&
                  playTarget.filter.levelComparison.value !== undefined
                    ? {
                        ...playTarget.filter.levelComparison,
                        value: playTarget.filter.levelComparison.value + ctx.playLevelCeilingDelta,
                      }
                    : playTarget.filter.levelComparison,
              },
            };
      const playCostScaling = levelCeilingAdjustedTarget.filter.playCostLteScaling;
      const scaledCostAdjustedTarget =
        playCostScaling === undefined
          ? levelCeilingAdjustedTarget
          : {
              ...levelCeilingAdjustedTarget,
              filter: {
                ...levelCeilingAdjustedTarget.filter,
                playCostLte:
                  (levelCeilingAdjustedTarget.filter.playCostLte ?? 0) +
                  playCostScalingDelta(playCostScaling, scaleFactor(ctx, playCostScaling)),
                playCostLteScaling: undefined,
              },
            };
      // playCostCeiling: dynamically raise the playCostLte ceiling before resolving candidates.
      // Counts cards matching filter.zone/controller across all applicable seats, then computes:
      //   ceiling = base + Math.floor(totalCards / per) * raise
      // and overrides the target filter's playCostLte with the result. (CAP-E16, BT21-079)
      const levelComparison = scaledCostAdjustedTarget.filter.levelComparison;
      const levelScaledTarget = materializeLevelComparisonScaling(
        scaledCostAdjustedTarget,
        levelComparison?.scaling === undefined ? 0 : scaleFactor(ctx, levelComparison.scaling),
      );
      const adjustedTarget = applyDecodeHostScope(action, applyPlayCostCeiling(ctx, action, levelScaledTarget));
      const playCostAdjustedTarget =
        action.ignorePlayCostLimit === true
          ? {
              ...adjustedTarget,
              filter: {
                ...adjustedTarget.filter,
                playCostLte: undefined,
                playCostLteScaling: undefined,
              },
            }
          : adjustedTarget;
      const zones = action.from && action.from.length > 0 ? action.from : DEFAULT_PLAY_ZONES;
      let candidates = playableCandidates(
        ctx,
        playCostAdjustedTarget,
        candidateLooseInstances(ctx, playCostAdjustedTarget, zones),
      );
      if (action.fromTriggerHandTrash === true) {
        const triggeringIds = new Set(ctx.trigger.handTrashedInstanceIds ?? []);
        candidates = candidates.filter((candidate) => triggeringIds.has(candidate.instanceId));
      }
      // Seat-level RestrictPlay: drop candidates the resolving effect's owner is forbidden
      // from playing (the effect is attributed to ctx.source.ownerSeat, so the prohibition on
      // THAT seat applies — Q4676; the source player's own effects are unaffected — Q4675).
      candidates = candidates.filter((c) => !ctx.fx.isPlayProhibited?.(ctx.source.ownerSeat, c.cardId, "play"));
      if (action.target?.filter?.excludeSameNameAsOwnTamers === true) {
        const ownTamerNames = new Set<string>();
        for (const permanent of ctx.game.player(ctx.source.ownerSeat).battleArea) {
          if (permanent.topCard === undefined) continue;
          const definition = ctx.game.definitionOf(permanent.topCard);
          if (!definition.kinds.includes(CardKind.Tamer)) continue;
          for (const name of effectiveStaticNames(definition)) ownTamerNames.add(name);
        }
        candidates = candidates.filter((candidate) => {
          const names = effectiveStaticNames(ctx.game.definitionOf({ cardId: candidate.cardId } as never));
          return !names.some((name) => ownTamerNames.has(name));
        });
      }
      if (ctx.effectRestrictions?.has("cannotPlaySameNameAsOwnDigimon")) {
        // `battleArea` is an ArraySchema, which throws on flatMap: iterate and collect.
        const ownNames = new Set<string>();
        for (const permanent of ctx.game.player(ctx.source.ownerSeat).battleArea) {
          if (permanent.topCard === undefined) continue;
          for (const name of effectiveStaticNames(ctx.game.definitionOf(permanent.topCard))) ownNames.add(name);
        }
        candidates = candidates.filter((candidate) => {
          const names = effectiveStaticNames(ctx.game.definitionOf({ cardId: candidate.cardId } as never));
          return !names.some((name) => ownNames.has(name));
        });
      }
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
      const excludedTriggerSubjectName = (action as typeof action & { excludeNameOfTriggerSubject?: boolean })
        .excludeNameOfTriggerSubject
        ? ctx.trigger.subjectPermanentId !== undefined
          ? ctx.game.permanentById(ctx.trigger.subjectPermanentId)?.topCard !== undefined
            ? ctx.game.definitionOf(ctx.game.permanentById(ctx.trigger.subjectPermanentId)!.topCard!).nameEn
            : undefined
          : undefined
        : undefined;
      if (excludedTriggerSubjectName !== undefined) {
        candidates = candidates.filter(
          (c) => ctx.game.definitionOf({ cardId: c.cardId } as never).nameEn !== excludedTriggerSubjectName,
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
      const asker = playCostAdjustedTarget.chooser === "opponent" ? requireOpponentAsk(ctx) : ctx.ask;
      const chosen = await pickLoose(ctx, playCostAdjustedTarget, candidates, undefined, asker, visibleZoneIds);
      if (playCostAdjustedTarget.chooser === "opponent" && action.optional === true) {
        ctx.lastOpponentDeclined = chosen.length === 0;
      }
      const costReduction = paidReduction(ctx, action) ?? action.costReduction;
      if (chosen.length > 0) {
        // Options are USED, not played as permanents. `playInstances` intentionally rejects
        // Option definitions, so routing every PlayWithoutCost target through it silently
        // dropped effects such as BT4-089 using Hell's Gate from hand. Preserve the Option
        // lifecycle here: resolve [Main], move it to trash, and fire whenOptionUsed. The
        // printed cost is still reported to watchers even though this action pays no cost. A DUAL
        // Digimon/Option selected through a Digimon/Tamer filter is played by its permanent side;
        // it is used as an Option only when the filter requests Option without a permanent kind.
        const requestedKinds = action.target?.filter?.kind ?? [];
        const explicitlyUsesOption =
          requestedKinds.includes("Option") && !requestedKinds.includes("Digimon") && !requestedKinds.includes("Tamer");
        const optionIds = chosen.filter((instanceId) => {
          const candidate = candidates.find((c) => c.instanceId === instanceId);
          if (candidate === undefined) return false;
          const kinds = ctx.game.definitionOf({ cardId: candidate.cardId } as never).kinds;
          const hasPermanentSide = kinds.includes(CardKind.Digimon) || kinds.includes(CardKind.Tamer);
          return kinds.includes(CardKind.Option) && (!hasPermanentSide || explicitlyUsesOption);
        });
        for (const optionId of optionIds) {
          const candidate = candidates.find((c) => c.instanceId === optionId);
          const usedCost =
            candidate === undefined ? undefined : ctx.game.definitionOf({ cardId: candidate.cardId } as never).playCost;
          await ctx.fx.useOptionFromHand(ctx, optionId, usedCost, {
            payCost: action.payCost,
            ...(action.reduceCostBy !== undefined ? { costDelta: action.reduceCostBy } : {}),
          });
        }
        const permanentIds = chosen.filter((instanceId) => !optionIds.includes(instanceId));
        let digiXrosMaterialInstanceIds: string[] = [];
        if (action.allowDigiXros === true && permanentIds.length === 1) {
          const playedCard = candidates.find((candidate) => candidate.instanceId === permanentIds[0]);
          const requirement = playedCard === undefined ? undefined : digiXrosRequirementFor(playedCard.cardId)?.[0];
          if (playedCard !== undefined && requirement !== undefined) {
            const ownerSeat = playedCard.ownerSeat;
            const player = ctx.game.player(ownerSeat);
            const playedDefinition = ctx.game.definitionOf({ cardId: playedCard.cardId } as never);
            const expanders = Array.from(player.battleArea).filter((permanent) => {
              if (permanent.isSuspended || permanent.topCard === undefined) return false;
              const expander = digiXrosZoneExpanderFor(permanent.topCard.cardId);
              return expander?.appliesTo(playedDefinition) === true;
            });
            const selectedExpanderCards =
              expanders.length === 0
                ? []
                : await ctx.ask.selectCards(ctx, {
                    candidates: expanders.map((permanent) => permanent.topCard!.instanceId),
                    min: 0,
                    max: expanders.length,
                  });
            const selectedExpanders = expanders.filter((permanent) =>
              selectedExpanderCards.includes(permanent.topCard!.instanceId),
            );
            // A triggered DigiXrosMaterialZoneExpansion is recorded by the canonical primitive
            // ledger. Consume that ledger here as well as the card-id registry: effect-driven
            // PlayWithoutCost must see the same extra source zones as an explicit playCard
            // declaration (EX4-062, BT19-079/087). The registry still supplies the precise
            // per-expander maxima and trait gate when a Tamer is selected interactively.
            const ledgerZones = new Set(ctx.fx.digiXrosExpandedZones?.(ownerSeat) ?? []);
            const ledgerUnderTamer =
              ledgerZones.has("underTamers") ||
              ledgerZones.has("underMyTamers") ||
              ledgerZones.has("underTamer") ||
              ledgerZones.has("digivolutionCards");
            const ledgerTrash = ledgerZones.has("trash");
            const selectedUnderTamerExpanders = selectedExpanders.filter((permanent) => {
              const expander = digiXrosZoneExpanderFor(permanent.topCard!.cardId);
              return expander !== undefined && expander.underTamerMax > 0;
            });
            const selectedUnrestrictedUnderTamer = selectedUnderTamerExpanders.some(
              (permanent) => digiXrosZoneExpanderFor(permanent.topCard!.cardId)?.underTamerHostScope !== "single",
            );
            // Legacy DigiXrosMaterialZoneExpansion ledger entries declare only zones and are
            // therefore independent unrestricted grants. A single-host restriction comes from
            // an interactively selected registered expander; any simultaneous legacy grant
            // intentionally overrides that restriction because it authorizes the zone on its own.
            const singleUnderTamerHost =
              selectedUnderTamerExpanders.length > 0 && !selectedUnrestrictedUnderTamer && !ledgerUnderTamer;
            const expansion = selectedExpanders.reduce(
              (current, permanent) => {
                const expander = digiXrosZoneExpanderFor(permanent.topCard!.cardId)!;
                return {
                  underTamerMax: current.underTamerMax + expander.underTamerMax,
                  trashMax: current.trashMax + expander.trashMax,
                };
              },
              { underTamerMax: 0, trashMax: 0 },
            );
            // The primitive ledger represents an already-paid expansion (for example,
            // a replacement effect from EX4-062/BT19-087), so it must remain usable
            // even though that Tamer is now suspended and is absent from the interactive
            // expander list. Merge it with any independently selected live expanders.
            if (ledgerUnderTamer) expansion.underTamerMax += 1;
            if (ledgerTrash) expansion.trashMax += 1;
            const defaultCandidates = [
              ...looseCardsInZone(ctx, ownerSeat, "hand").filter(
                (candidate) => candidate.instanceId !== playedCard!.instanceId,
              ),
              ...Array.from(player.battleArea).flatMap((permanent) =>
                permanent.inBreeding || permanent.topCard === undefined
                  ? []
                  : [
                      {
                        instanceId: permanent.topCard.instanceId,
                        cardId: permanent.topCard.cardId,
                        ownerSeat: permanent.topCard.ownerSeat,
                        hostPermanentId: permanent.permanentId,
                      },
                    ],
              ),
            ];
            const underTamerCandidates =
              expansion.underTamerMax > 0 ? looseCardsInZone(ctx, ownerSeat, "underTamers") : [];
            let scopedUnderTamerCandidates = underTamerCandidates;
            if (singleUnderTamerHost) {
              const hostIds = [...new Set(underTamerCandidates.map((candidate) => candidate.hostPermanentId))].filter(
                (hostId): hostId is string => hostId !== undefined,
              );
              const selectedHostIds =
                hostIds.length <= 1
                  ? hostIds
                  : await ctx.ask.chooseTargets(ctx, { candidates: hostIds, min: 1, max: 1 });
              const selectedHostId = selectedHostIds[0];
              scopedUnderTamerCandidates =
                selectedHostId === undefined
                  ? []
                  : underTamerCandidates.filter((candidate) => candidate.hostPermanentId === selectedHostId);
            }
            const expandedCandidates = [
              ...scopedUnderTamerCandidates,
              ...(expansion.trashMax > 0 ? looseCardsInZone(ctx, ownerSeat, "trash") : []),
            ];
            const materialCandidates = [...defaultCandidates, ...expandedCandidates].filter((candidate) =>
              materialsSatisfyRecipe(
                [ctx.game.definitionOf({ cardId: candidate.cardId } as never)],
                requirement.materials,
              ),
            );
            const materialCap =
              requirement.maxMaterials ??
              (requirement.materials.length === 1 ? materialCandidates.length : requirement.materials.length);
            const selected = await ctx.ask.selectCards(ctx, {
              candidates: materialCandidates.map((candidate) => candidate.instanceId),
              min: 0,
              max: materialCap,
            });
            const selectedCandidates = selected
              .map((instanceId) => materialCandidates.find((candidate) => candidate.instanceId === instanceId))
              .filter((candidate): candidate is (typeof materialCandidates)[number] => candidate !== undefined);
            const selectedUnderTamer = selectedCandidates.filter((candidate) =>
              looseCardsInZone(ctx, ownerSeat, "underTamers").some(
                (underCard) => underCard.instanceId === candidate.instanceId,
              ),
            ).length;
            const selectedTrash = selectedCandidates.filter((candidate) =>
              looseCardsInZone(ctx, ownerSeat, "trash").some(
                (trashCard) => trashCard.instanceId === candidate.instanceId,
              ),
            ).length;
            const definitions = selectedCandidates.map((candidate) =>
              ctx.game.definitionOf({ cardId: candidate.cardId } as never),
            );
            if (
              selected.length > 0 &&
              selectedUnderTamer <= expansion.underTamerMax &&
              selectedTrash <= expansion.trashMax &&
              materialsSatisfyRecipe(definitions, requirement.materials)
            ) {
              if (selectedUnderTamer > 0 || selectedTrash > 0) {
                await ctx.fx.suspend(
                  selectedExpanders.map((permanent) => permanent.permanentId),
                  { byEffectSeat: ownerSeat, byEffectCardId: ctx.source.cardId },
                );
              }
              digiXrosMaterialInstanceIds = selected;
            }
          }
        }
        const hostPermanentIds = Object.fromEntries(
          permanentIds
            .map((instanceId) => {
              const hostPermanentId = candidates.find(
                (candidate) => candidate.instanceId === instanceId,
              )?.hostPermanentId;
              return hostPermanentId === undefined ? undefined : [instanceId, hostPermanentId];
            })
            .filter((entry): entry is [string, string] => entry !== undefined),
        );
        const played =
          permanentIds.length > 0
            ? await ctx.fx.playInstances(permanentIds, {
                payCost: action.payCost,
                breeding: action.breeding,
                suspended: action.suspended,
                effectSourceCardId: ctx.source.cardId,
                ...(action.playedByDecode === true ? { playedByDecode: true } : {}),
                ...(costReduction !== undefined ? { costDelta: costReduction } : {}),
                ...((action as typeof action & { costOverride?: number }).costOverride !== undefined
                  ? { costOverride: (action as typeof action & { costOverride?: number }).costOverride }
                  : {}),
                ...(digiXrosMaterialInstanceIds.length > 0 ? { digiXrosMaterialInstanceIds } : {}),
                ...(action.suppressOnPlayEffects === true ? { suppressOnPlayEffects: true } : {}),
                hostPermanentIds,
              })
            : [];
        const playedPermanentIds = (played ?? []).map((p) => p.permanentId);
        ctx.lastPlayedPermanentIds = playedPermanentIds;
        bindPlayWithoutCost(playedPermanentIds);
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
      let pfzCandidates = playableCandidates(ctx, action.target, candidateLooseInstances(ctx, action.target, zones));

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
        let digiXrosMaterialInstanceIds: string[] = [];
        if (action.digiXrosMaterialsFrom !== undefined && pfzChosen.length === 1) {
          const chosenCard = pfzCandidates.find((card) => card.instanceId === pfzChosen[0]);
          const requirement = chosenCard === undefined ? undefined : digiXrosRequirementFor(chosenCard.cardId)?.[0];
          if (requirement !== undefined) {
            const allMaterialCandidates = action.digiXrosMaterialsFrom
              .flatMap((zone) =>
                zone === "battleArea"
                  ? Array.from(ctx.game.player(ctx.source.ownerSeat).battleArea).flatMap((permanent) =>
                      permanent.inBreeding || permanent.topCard === undefined
                        ? []
                        : [
                            {
                              instanceId: permanent.topCard.instanceId,
                              cardId: permanent.topCard.cardId,
                              ownerSeat: permanent.topCard.ownerSeat,
                              hostPermanentId: permanent.permanentId,
                            },
                          ],
                    )
                  : looseCardsInZone(ctx, ctx.source.ownerSeat, zone),
              )
              .filter((card) => card.instanceId !== pfzChosen[0]);
            // Keep the selection prompt faithful to the chosen DigiXros recipe.  The normal
            // hand-play path filters each candidate before prompting; cards assembled from
            // another loose zone need the same guard or an auto-selection can consume invalid
            // cards and silently fall back to a non-DigiXros play.
            const materialDefinition = (candidate: (typeof allMaterialCandidates)[number]) => {
              const definition = ctx.game.definitionOf({ cardId: candidate.cardId } as never);
              return candidate.instanceId === ctx.source.instanceId && action.digiXrosSourceMaterialName !== undefined
                ? { ...definition, nameEn: action.digiXrosSourceMaterialName }
                : definition;
            };
            const materialCandidates = allMaterialCandidates.filter((candidate) =>
              materialsSatisfyRecipe([materialDefinition(candidate)], requirement.materials),
            );
            const materialCap =
              requirement.maxMaterials ??
              (requirement.materials.length === 1 ? materialCandidates.length : requirement.materials.length);
            const selected = await ctx.ask.selectCards(ctx, {
              candidates: materialCandidates.map((card) => card.instanceId),
              min: 0,
              max: materialCap,
            });
            const selectedDefinitions = selected.map((id) =>
              materialDefinition(materialCandidates.find((card) => card.instanceId === id)!),
            );
            if (materialsSatisfyRecipe(selectedDefinitions, requirement.materials))
              digiXrosMaterialInstanceIds = selected;
          }
        }
        const played = await ctx.fx.playInstances(pfzChosen, {
          payCost,
          ...(digiXrosMaterialInstanceIds.length > 0 ? { digiXrosMaterialInstanceIds } : {}),
          ...(costDelta > 0 ? { costDelta } : {}),
          ...(action.suppressOnPlayEffects === true ? { suppressOnPlayEffects: true } : {}),
        });
        ctx.lastPlayedPermanentIds = (played ?? []).map((p) => p.permanentId);
        if (action.bindResultAs) {
          if (!ctx.boundPlayed) (ctx as { boundPlayed: Map<string, Set<string>> }).boundPlayed = new Map();
          ctx.boundPlayed!.set(action.bindResultAs, new Set(ctx.lastPlayedPermanentIds));
        }
      } else {
        ctx.lastPlayedPermanentIds = [];
        if (action.bindResultAs) {
          if (!ctx.boundPlayed) (ctx as { boundPlayed: Map<string, Set<string>> }).boundPlayed = new Map();
          ctx.boundPlayed!.set(action.bindResultAs, new Set());
        }
      }
      ctx.lastEffectActed = pfzChosen.length > 0;
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
        for (const tokenRef of tokenNames) {
          // The catalog sometimes carries the complete synthetic-token descriptor rather
          // than the registry alias. Resolve the printed descriptor to the shared token
          // registry while preserving the card's authored stats for future token metadata.
          const tokenName = typeof tokenRef === "string" ? tokenRef : tokenRef.name;
          const registryName = tokenName === "Atho, René & Por" ? "AthoRenePor Token" : tokenName;
          await ctx.fx.playToken(placementSeat, registryName, {
            payCost: action.payCost ?? false,
            suspended: action.suspended ?? false,
            ...(typeof tokenRef === "string" || tokenRef.keywords === undefined
              ? {}
              : {
                  keywords: tokenRef.keywords.map((keyword) => ({
                    keyword: keyword.keyword,
                    amount: keyword.amount,
                    specifiers: keyword.colors,
                  })),
                }),
          });
        }
      }
      return false;
    }
    case "PlayPerLevel": {
      await runPlayPerLevel(ctx, action);
      return false;
    }
    default:
      // Unreachable: runAction routes only this family's kinds here, and its own default
      // reports anything the Action union does not cover.
      return false;
  }
}
