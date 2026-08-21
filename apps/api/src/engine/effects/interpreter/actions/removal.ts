// Deleting, trashing, and returning cards.

import { requireOpponentAsk } from "../../../decisions/decisionApi.js";
import type { ActionScope } from "../dispatch.js";
import type { EffectContext } from "../../EffectContext.js";
import type { CardColor } from "@aegis/shared";
import { seatsForController } from "../matching/permanent.js";
import { countMatching, scaleFactor } from "../scaling.js";
import { candidateLooseInstances, looseCardsInZone, pickLoose } from "../targeting/loose.js";
import {
  candidatePermanents,
  raiseDeletionDpCap,
  resolveExceptSurvivors,
  resolvePermanentTargets,
  resolveTotalDpCapTargets,
  resolveTotalPlayCostBudgetTargets,
  topInstanceIds,
} from "../targeting/permanents.js";
import type { Action, Target } from "@aegis/shared";

export async function runRemovalAction(ctx: EffectContext, action: Action, scope: ActionScope): Promise<boolean> {
  const { scale } = scope;
  switch (action.kind) {
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
    case "DeletePerColor": {
      const source = ctx.source.permanent();
      if (source === undefined || action.source !== "digivolutionCards") return false;
      // `stack` is an ArraySchema, which throws on flatMap: iterate and collect.
      const colorSet = new Set<CardColor>();
      for (const card of source.stack) {
        for (const color of ctx.game.definitionOf(card).colors) colorSet.add(color);
      }
      const colors = [...colorSet];
      const selected: string[] = [];
      for (const color of colors) {
        const candidates = candidatePermanents(ctx, action.target).filter((permanent) => {
          if (selected.includes(permanent.permanentId)) return false;
          const def = permanent.topCard === undefined ? undefined : ctx.game.definitionOf(permanent.topCard);
          return def?.colors.includes(color) === true;
        });
        if (candidates.length === 0) continue;
        // Prefer a single-color candidate over a multicolor candidate. This preserves a
        // multicolor Digimon for another color when both choices are possible (EX9-074 / KB
        // Q5005): a red single-color Digimon must be used for red before a red/blue Digimon.
        const orderedCandidates = [...candidates].sort((left, right) => {
          const leftColors = left.topCard === undefined ? 0 : ctx.game.definitionOf(left.topCard).colors.length;
          const rightColors = right.topCard === undefined ? 0 : ctx.game.definitionOf(right.topCard).colors.length;
          return leftColors - rightColors;
        });
        const chosen =
          orderedCandidates.length === 1
            ? orderedCandidates[0]!.permanentId
            : (
                await ctx.ask.chooseTargets(ctx, {
                  candidates: orderedCandidates.map((p) => p.permanentId),
                  min: 1,
                  max: 1,
                })
              )[0];
        if (chosen !== undefined) selected.push(chosen);
      }
      if (selected.length > 0) await ctx.fx.deletePermanent(selected);
      ctx.lastEffectActed = selected.length > 0;
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
        const moved = chosen.length > 0 ? await ctx.fx.trash(chosen, { byEffectSeat: ctx.source.ownerSeat }) : [];
        ctx.lastTrashedCards = moved.map((card) => ({
          instanceId: card.instanceId,
          cardId: card.cardId,
          dp: ctx.game.definitionOf(card).dp ?? 0,
        }));
        // Bind the branch-acted result so an "if you did" tail (BT16-094 OR-modal) can gate.
        ctx.lastEffectActed = moved.length > 0;
        // Store actual trash count under the named key for downstream scaling. (CAP-E12/E13)
        if (action.trackCount !== undefined) {
          if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
          ctx.namedCounts.set(action.trackCount, moved.length);
        }
        if (action.bindResultAs !== undefined) {
          if (ctx.boundPlayed === undefined) ctx.boundPlayed = new Map();
          ctx.boundPlayed.set(action.bindResultAs, new Set(moved.map((card) => card.instanceId)));
        }
        // A selected card that a restriction/replacement kept in hand did not pay a
        // printed "by trashing" gate. Abort the dependent tail just like an explicit
        // decline; candidate selection alone is never proof that the cost was paid.
        return action.abortOnDecline === true && (chosen.length === 0 || moved.length !== chosen.length);
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
        const n = action.target.count === "all"
          ? deck.length
          : action.target.count * (scale ?? 1);
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
    case "Return": {
      const returnTarget =
        action.playCostCeiling === undefined
          ? action.target
          : {
              ...action.target,
              filter: {
                ...action.target.filter,
                playCostLte:
                  action.playCostCeiling.base +
                  Math.floor(
                    scaleFactor(ctx, {
                      per: action.playCostCeiling.per,
                      filter: action.playCostCeiling.filter,
                      unit: action.playCostCeiling.unit,
                    }),
                  ) *
                    action.playCostCeiling.raise,
              },
            };
      // Security effects such as BT10-109 encode "add this card to its owner's hand"
      // as Return(isSelfRef). The source is a loose security card, so it has no
      // permanent for resolvePermanentTargets to find.
      if (returnTarget.isSelf || returnTarget.filter.isSelfRef) {
        if (action.to === "hand") await ctx.fx.returnToHand([ctx.source.instanceId]);
        else await ctx.fx.returnToDeck([ctx.source.instanceId], { toTop: action.to === "deckTop" });
        return false;
      }
      if (returnTarget.totalPlayCostBudget !== undefined) {
        const ids = topInstanceIds(ctx, await resolveTotalPlayCostBudgetTargets(ctx, returnTarget));
        if (ids.length === 0) return false;
        if (action.to === "hand") await ctx.fx.returnToHand(ids);
        else await ctx.fx.returnToDeck(ids, { toTop: action.to === "deckTop" });
        return false;
      }
      // A non-battle-area zone target ("return 1 [X] from your trash/hand/security/... to
      // your hand", BT1-011) sources a LOOSE card instance, not a battle-area permanent —
      // resolvePermanentTargets only scans battleArea and would always find zero candidates,
      // silently no-opping the whole effect. Route through the same loose-instance resolution
      // the "Trash" case already uses for its hand-zone branch.
      const zone = returnTarget.filter.zone;
      const looseZones = action.from ?? (zone !== undefined && zone !== "battleArea" ? [zone] : undefined);
      if (looseZones !== undefined) {
        const candidates = candidateLooseInstances(ctx, returnTarget, looseZones);
        const visibleZoneIds =
          looseZones.length === 1 && (looseZones[0] === "trash" || looseZones[0] === "hand")
            ? seatsForController(ctx, returnTarget.filter).flatMap((seat) =>
                looseCardsInZone(ctx, seat, looseZones[0]!).map((candidate) => candidate.instanceId),
              )
            : undefined;
        const chosen = await pickLoose(ctx, returnTarget, candidates, undefined, ctx.ask, visibleZoneIds);
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
      const ids = topInstanceIds(ctx, await resolvePermanentTargets(ctx, returnTarget));
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
    case "DelayedDelete": {
      // "At the next end of your opponent's turn, delete it" after a PlayWithoutCost branch.
      // The target is the permanent(s) just created by the prior play action in this same
      // effect resolution, not the card currently resolving the effect.
      for (const permanentId of ctx.lastPlayedPermanentIds ?? []) {
        if (action.timing === "endOfOpponentTurn") {
          ctx.fx.delayedDeletePlayed?.(permanentId, "endOfOpponentTurn");
        } else {
          ctx.fx.delayedDeletePlayed?.(permanentId);
        }
      }
      return false;
    }
    case "DelayedDeletePlayed": {
      // EX10-035: "at turn end, delete the Digimon this effect played." The played permanent is
      // deletes it at the owner's turn end, expiring at that same boundary.
      const playedIds = ctx.lastPlayedPermanentIds ?? [];
      if (playedIds.length > 0) {
        for (const permanentId of playedIds) ctx.fx.delayedDeletePlayed?.(permanentId);
      } else {
        const self = ctx.source.permanent();
        if (self !== undefined) ctx.fx.delayedDeletePlayed?.(self.permanentId);
      }
      return false;
    }
    default:
      // Unreachable: runAction routes only this family's kinds here, and its own default
      // reports anything the Action union does not cover.
      return false;
  }
}
