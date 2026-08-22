// Playing cards from hand, deck, trash, and security.

import type { EffectContext } from "../../EffectContext.js";
import type { ActionScope } from "../dispatch.js";
import { definitionMatches } from "../matching/definition.js";
import { permanentMatchesFilter, seatsForController } from "../matching/permanent.js";
import { countMatching, scaleFactor } from "../scaling.js";
import { DEFAULT_PLAY_ZONES, candidateLooseInstances, looseCardsInZone, pickLoose } from "../targeting/loose.js";
import { runPlayPerLevel } from "./dna.js";
import { CardKind, effectiveStaticNames } from "@aegis/shared";
import type { Action, Seat, Target } from "@aegis/shared";

export async function runPlayAction(ctx: EffectContext, action: Action, scope: ActionScope): Promise<boolean> {
  const { scale } = scope;
  switch (action.kind) {
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
        const fromSecurity = action.from?.includes("security") === true || self.isInSecurity?.() === true;
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
            ...(action.breeding === true ? { breeding: true } : {}),
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
            ...(action.breeding === true ? { breeding: true } : {}),
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
