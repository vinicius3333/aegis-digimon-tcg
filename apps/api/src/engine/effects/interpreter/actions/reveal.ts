// Revealing cards and dispatching what the controller takes from them.

import { matchingAlternateDigivolutionRequirement, matchingEvoCost } from "../../../cards/cardData.js";
import type { EffectContext } from "../../EffectContext.js";
import { unsupported } from "../errors.js";
import { DefinitionFacts, definitionMatches } from "../matching/definition.js";
import { permanentMatchesFilter } from "../matching/permanent.js";
import { candidateLooseInstances, pickLoose } from "../targeting/loose.js";
import { candidatePermanents, effectiveTargetCount, resolvePermanentTargets } from "../targeting/permanents.js";
import { isDigimon } from "@aegis/shared";
import type { Action, Filter, Target } from "@aegis/shared";

/**
 * Reveal without moving cards. Deck reveals use the primitive that flips the top N
 * cards face-up in place. Hand reveals select the cards to expose but intentionally
 * perform no zone movement; the follow-up actions carry any actual disposition.
 */
export async function runReveal(ctx: EffectContext, action: Extract<Action, { kind: "Reveal" }>): Promise<void> {
  const target = action.target;
  const targetFilter = target?.filter as (Filter & { location?: string; top?: boolean }) | undefined;
  const targetZone = targetFilter?.zone ?? targetFilter?.location ?? action.zone;
  const count = target?.count === "all" ? 10000 : (target?.count ?? action.count ?? 1);

  if (target !== undefined && targetZone === "hand") {
    const candidates = candidateLooseInstances(ctx, target, ["hand"]);
    await pickLoose(ctx, target, candidates);
    return;
  }

  if (targetZone === "deck" || targetZone === undefined) {
    let seat = ctx.source.ownerSeat;
    const controller = targetFilter?.controller ?? action.controller;
    if (controller === "opponent") {
      seat = ctx.game.opponentOf(ctx.source.ownerSeat);
    } else if (controller === "any") {
      const choice = await ctx.ask.chooseOption(ctx, ["Your deck", "Opponent's deck"]);
      seat = choice === 0 ? ctx.source.ownerSeat : ctx.game.opponentOf(ctx.source.ownerSeat);
    }
    const revealed = await ctx.fx.reveal(seat, count);
    ctx.lastRevealedCards = revealed.map((card) => ({
      instanceId: card.instanceId,
      cardId: card.cardId,
      ownerSeat: card.ownerSeat,
    }));
    return;
  }

  unsupported(ctx, action, `Reveal from unsupported zone "${String(targetZone)}"`);
}

/**
 * Reveal the top N, then dispatch each matching revealed card per its `to`
 * disposition (add to hand / play without cost), and send the rest to the deck
 * bottom/top (or trash) in any order. The reveal flips the top N face-up in place;
 * `returnToHand`/`returnToDeck`/`trash` then act on those deck instances.
 *
 * "play" is executable: the chosen revealed deck card is moved to hand and played
 * free (the net effect of "play a card among them without paying its cost").
 * "digivolve" moves a chosen revealed card onto a compatible host without paying
 * its cost. Its evolution bonus draw occurs while the unrevealed deck is still
 * separate; the remaining revealed cards return before [When Digivolving] opens
 * (BT1-078 KB Q931/Q932).
 */
export async function runRevealAdd(ctx: EffectContext, action: Extract<Action, { kind: "RevealAdd" }>): Promise<void> {
  const seat = ctx.source.ownerSeat;
  if (action.trackCount !== undefined) {
    ctx.namedCounts ??= new Map();
    ctx.namedCounts.set(action.trackCount, 0);
  }
  const revealed = await ctx.fx.reveal(seat, action.revealCount);
  if (revealed.length === 0) return;
  ctx.lastRevealedCards = revealed.map((card) => ({
    instanceId: card.instanceId,
    cardId: card.cardId,
    ownerSeat: card.ownerSeat,
  }));

  const taken = new Set<string>();
  const toHand: string[] = [];
  const toTrash: string[] = [];
  const toPlay: { instanceId: string; costDelta?: number }[] = [];
  const toDigivolve: { instanceId: string; target?: Target; payCost?: boolean }[] = [];
  const toSecurity: { instanceId: string; toTop: boolean; faceDown: boolean }[] = [];
  const toPlaceUnder: { instanceId: string; underFilter?: import("@aegis/shared").Filter }[] = [];
  const toUnderTamer: { instanceId: string; underFilter?: import("@aegis/shared").Filter }[] = [];
  if (action.trashFilter !== undefined) {
    for (const card of revealed) {
      if (definitionMatches(action.trashFilter, ctx.game.definitionOf(card))) {
        taken.add(card.instanceId);
        toTrash.push(card.instanceId);
      }
    }
  }
  // EX2-072 Blue Card: first offer a free digivolution into one compatible,
  // non-white revealed Digimon.  Only cards that have at least one legal host are
  // selectable; the full reveal remains visible so the UI can render ineligible cards
  // disabled instead of hiding them. Declining (or having no legal pair) unlocks the
  // printed "if you don't" add-to-hand fallback below.
  let digivolveDeclined = true;
  if (action.digivolveOption !== undefined) {
    const option = action.digivolveOption;
    const targetSpec = option.target ?? {
      filter: { controller: "mine", kind: ["Digimon"] },
      count: 1,
    };
    const hosts = ctx.game.player(seat).battleArea.filter((permanent) => {
      if (permanent.topCard === undefined) return false;
      return permanentMatchesFilter(ctx, permanent, targetSpec.filter, ctx.source);
    });
    const compatible = revealed.filter((card) => {
      const into = ctx.game.definitionOf(card);
      if (!definitionMatches(option.into, into)) return false;
      return hosts.some((host) => {
        if (host.topCard === undefined) return false;
        const base = ctx.game.definitionOf(host.topCard);
        return (
          matchingEvoCost(into, base) !== undefined ||
          matchingAlternateDigivolutionRequirement(into, base) !== undefined
        );
      });
    });
    if (compatible.length > 0) {
      const chosen = await ctx.ask.selectCards(ctx, {
        candidates: compatible.map((card) => card.instanceId),
        visible: revealed.map((card) => card.instanceId),
        visibleCards: revealed.map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
        min: option.optional === true ? 0 : 1,
        max: 1,
      });
      const selected = compatible.find((card) => card.instanceId === chosen[0]);
      if (selected !== undefined) {
        taken.add(selected.instanceId);
        toDigivolve.push({
          instanceId: selected.instanceId,
          target: option.target,
          payCost: option.payCost,
        });
        digivolveDeclined = false;
      }
    }
  }
  for (const spec of action.add) {
    if (spec.ifDigivolveDeclined === true && !digivolveDeclined) continue;
    const qualifies = (c: import("@aegis/shared").CardInstance) => {
      const def = ctx.game.definitionOf(c);
      // "Add 1 [X] or 1 Y card among them": a card qualifies under EITHER alternative;
      // `count` is the total across the union, so the player adds 1 from either, not one each.
      return definitionMatches(spec.filter, def) || (spec.orFilters ?? []).some((alt) => definitionMatches(alt, def));
    };
    // requiresMinRevealed: count ALL matching cards among the FULL revealed set (including already
    // taken by earlier slots) — KB Q3114 "if 2+ applicable cards are revealed" refers to the total
    // revealed applicables, not the remaining after earlier slots have consumed some.
    if (spec.requiresMinRevealed !== undefined) {
      const totalApplicable = revealed.filter(qualifies).length;
      if (totalApplicable < spec.requiresMinRevealed) continue;
    }
    let matches = revealed.filter((c) => !taken.has(c.instanceId) && qualifies(c));
    if (spec.to === "digivolve") {
      const target = spec.digivolveTarget ?? {
        filter: { controller: "mine", kind: ["Digimon"] },
        count: 1,
      };
      const hosts = candidatePermanents(ctx, target);
      // A revealed card is selectable only when at least one legal host can
      // actually digivolve into it. Previously the prompt filtered only the
      // printed card filter (trait/color/level), so an incompatible pick was
      // marked as taken and then neither digivolved nor reached `rest`.
      matches = matches.filter((card) => {
        const into = ctx.game.definitionOf(card);
        return hosts.some((host) => {
          if (host.topCard === undefined) return false;
          const base = ctx.game.definitionOf(host.topCard);
          return (
            matchingEvoCost(into, base) !== undefined ||
            matchingAlternateDigivolutionRequirement(into, base) !== undefined
          );
        });
      });
    }
    // Budget-constrained free play: choose any subset whose SUMMED play cost <= costBudget
    // ("total play costs add up to N or less", BT11-044 / "N play cost's total worth", BT14-068).
    // The card count is bounded by the budget, not a fixed `count`; the pick is always optional.
    if (spec.costBudget !== undefined) {
      const budget = spec.costBudget;
      const playCostOf = (c: import("@aegis/shared").CardInstance) => ctx.game.definitionOf(c).playCost ?? 0;
      // A card can only ever be part of a within-budget subset if it individually fits.
      const affordable = matches.filter((c) => playCostOf(c) <= budget);
      if (affordable.length > 0) {
        const ids = await ctx.ask.selectCards(ctx, {
          candidates: affordable.map((c) => c.instanceId),
          visible: revealed.map((c) => c.instanceId),
          visibleCards: revealed.map((c) => ({ instanceId: c.instanceId, cardId: c.cardId })),
          min: 0,
          max: affordable.length,
          maxTotalPlayCost: budget,
        });
        let selected = affordable.filter((c) => ids.includes(c.instanceId));
        // Enforce the budget server-side — never trust the client. Drop the most expensive
        // picks until the running total is within budget, so an over-budget selection is
        // rejected down to a legal subset rather than played in full.
        selected.sort((a, b) => playCostOf(b) - playCostOf(a));
        let total = selected.reduce((sum, c) => sum + playCostOf(c), 0);
        while (total > budget && selected.length > 0) {
          total -= playCostOf(selected[0]!);
          selected = selected.slice(1);
        }
        for (const c of selected) {
          taken.add(c.instanceId);
          toPlay.push({ instanceId: c.instanceId });
        }
      }
      continue;
    }
    const want =
      spec.count === "all"
        ? matches.length
        : effectiveTargetCount(ctx, {
            filter: spec.filter,
            count: spec.count,
            ...(spec.countModifier !== undefined ? { countModifier: spec.countModifier } : {}),
          } as Target);
    let chosen = matches.slice(0, want);
    // A bounded reveal selection is confirmed even when only one card is eligible. This keeps
    // every disposition (hand, play, security, place-under, etc.) on the same UI path and lets
    // the player inspect the full reveal, including ineligible cards shown as disabled. Slots
    // that take every matching card remain forced; optional/up-to slots still allow 0.
    if (matches.length > 0 && (spec.optional || spec.upTo || spec.count !== "all")) {
      const ids = await ctx.ask.selectCards(ctx, {
        candidates: matches.map((c) => c.instanceId),
        visible: revealed.map((c) => c.instanceId),
        visibleCards: revealed.map((c) => ({ instanceId: c.instanceId, cardId: c.cardId })),
        min: spec.optional || spec.upTo ? 0 : Math.min(want, matches.length),
        max: want,
      });
      chosen = matches.filter((c) => ids.includes(c.instanceId));
    }
    for (const c of chosen) {
      taken.add(c.instanceId);
      let disposition: {
        to?: "hand" | "trash" | "play" | "digivolve" | "placeUnder" | "underTamer" | "security";
        underFilter?: import("@aegis/shared").Filter;
        toTop?: boolean;
        faceDown?: boolean;
      } = { to: spec.to, underFilter: spec.underFilter, toTop: spec.toTop, faceDown: spec.faceDown };
      const alternatives = spec.orDispositions ?? [];
      if (alternatives.length > 0) {
        const choices = [disposition, ...alternatives];
        const labels = choices.map((choice) => choice.to ?? "hand");
        const picked = await ctx.ask.chooseOption(ctx, labels);
        disposition = choices[picked] ?? disposition;
      }
      if (disposition.to === "play") toPlay.push({ instanceId: c.instanceId, costDelta: spec.costDelta });
      else if (disposition.to === "trash") toTrash.push(c.instanceId);
      else if (disposition.to === "digivolve")
        toDigivolve.push({ instanceId: c.instanceId, target: spec.digivolveTarget });
      else if (disposition.to === "security")
        toSecurity.push({
          instanceId: c.instanceId,
          toTop: disposition.toTop ?? true,
          faceDown: disposition.faceDown ?? true,
        });
      else if (disposition.to === "placeUnder")
        toPlaceUnder.push({ instanceId: c.instanceId, underFilter: disposition.underFilter });
      else if (disposition.to === "underTamer")
        toUnderTamer.push({ instanceId: c.instanceId, underFilter: disposition.underFilter });
      else toHand.push(c.instanceId);
    }
  }

  for (const selected of toSecurity) {
    await ctx.fx.addSecurity(seat, [selected.instanceId], {
      toTop: selected.toTop,
      faceUp: !selected.faceDown,
    });
  }
  if (toHand.length > 0) await ctx.fx.returnToHand(toHand);
  if (action.trackCount !== undefined) {
    ctx.namedCounts ??= new Map();
    ctx.namedCounts.set(action.trackCount, toHand.length);
  }
  if (action.trackPlayedCount !== undefined) {
    ctx.namedCounts ??= new Map();
    ctx.namedCounts.set(action.trackPlayedCount, toPlay.length);
  }
  if (toTrash.length > 0) await ctx.fx.trash(toTrash, { byEffectSeat: ctx.source.ownerSeat });
  if (toPlay.length > 0) {
    const toPlayIds = toPlay.map((p) => p.instanceId);
    await ctx.fx.returnToHand(toPlayIds, { silent: true });
    // Group by costDelta so a "play with the cost reduced by N" spec (BT25-074) plays
    // separately from a plain "without paying the cost" spec (payCost: false) in the
    // same RevealAdd action.
    const freeIds = toPlay.filter((p) => p.costDelta === undefined).map((p) => p.instanceId);
    const reducedGroups = new Map<number, string[]>();
    for (const p of toPlay) {
      if (p.costDelta === undefined) continue;
      const group = reducedGroups.get(p.costDelta) ?? [];
      group.push(p.instanceId);
      reducedGroups.set(p.costDelta, group);
    }
    // Effect-played cards must open their own [On Play] window and `whenPlayed` bus.
    // `playFromHand` is the legacy placement-only primitive; `playInstances` owns the
    // complete effect-play lifecycle (ST13-02 revealing ST13-09, and the wider reveal-play
    // family). The revealed cards were staged into hand above solely to leave the reveal pool.
    if (freeIds.length > 0) await ctx.fx.playInstances(freeIds, { payCost: false });
    for (const [costDelta, ids] of reducedGroups) {
      // "With the play cost reduced by N" is not a free play. The old call omitted
      // `payCost:true`, silently waiving the remaining cost in every RevealAdd reduced-play.
      await ctx.fx.playInstances(ids, { payCost: true, costDelta });
    }
  }
  // "place N [X] as the bottom digivolution card of one of your [Y] Digimon"
  if (toPlaceUnder.length > 0) {
    for (const { instanceId, underFilter } of toPlaceUnder) {
      const candidates = ctx.game.player(seat).battleArea.filter((p) => {
        if (!p.topCard || !isDigimon(ctx.game.definitionOf(p.topCard))) return false;
        return underFilter === undefined || permanentMatchesFilter(ctx, p, underFilter, ctx.source);
      });
      if (candidates.length === 0) {
        // No legal host; return to deck bottom (the effect can't fire without a valid host).
        await ctx.fx.returnToDeck([instanceId], { toTop: false });
        continue;
      }
      let hostPermanentId = candidates[0]!.permanentId;
      if (candidates.length > 1) {
        const chosen = await ctx.ask.chooseTargets(ctx, {
          candidates: candidates.map((p) => p.permanentId),
          min: 1,
          max: 1,
        });
        if (chosen.length > 0) hostPermanentId = chosen[0]!;
      }
      // Move the revealed card from the revealed pool to the host's digivolution stack (bottom).
      await ctx.fx.placeUnder(hostPermanentId, [instanceId]);
    }
  }
  // "place N [X] under one of your Tamer permanents" (BT19-055 `to:"underTamer"`):
  // controller chooses which of their Tamer permanents receives the card.
  if (toUnderTamer.length > 0) {
    const tamerCandidates = ctx.game.player(seat).battleArea.filter((p) => {
      if (!p.topCard) return false;
      const topDef = ctx.game.definitionOf(p.topCard);
      return topDef.kinds.includes("Tamer" as never);
    });
    for (const { instanceId, underFilter } of toUnderTamer) {
      const candidates = tamerCandidates.filter(
        (p) => underFilter === undefined || permanentMatchesFilter(ctx, p, underFilter, ctx.source),
      );
      if (candidates.length === 0) {
        await ctx.fx.returnToDeck([instanceId], { toTop: false });
        continue;
      }
      let hostPermanentId = candidates[0]!.permanentId;
      if (candidates.length > 1) {
        const chosen = await ctx.ask.chooseTargets(ctx, {
          candidates: candidates.map((p) => p.permanentId),
          min: 1,
          max: 1,
        });
        if (chosen.length > 0) hostPermanentId = chosen[0]!;
      }
      await ctx.fx.placeUnder(hostPermanentId, [instanceId]);
    }
  }
  // The rest: send to deck bottom/top (trash is rarer; treated as deckBottom). A
  // reveal-evolution calls this after its bonus draw but before the evolved card's
  // [When Digivolving] window (BT1-078 KB Q931/Q932).
  const disposeRest = async (): Promise<void> => {
    let rest = revealed.filter((c) => !taken.has(c.instanceId)).map((c) => c.instanceId);
    if (rest.length === 0) return;
    if (action.rest === "trash") await ctx.fx.trash(rest, { byEffectSeat: ctx.source.ownerSeat });
    else if (action.rest === "deckTopOrBottom") {
      const choice = await ctx.ask.chooseOption(ctx, ["Top of deck", "Bottom of deck"]);
      if (rest.length > 1) {
        rest =
          (await ctx.ask.orderCards?.(ctx, {
            candidates: rest,
            visibleCards: revealed
              .filter((card) => rest.includes(card.instanceId))
              .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
            destination: choice === 0 ? "deckTop" : "deckBottom",
          })) ?? rest;
      }
      const toTop = choice === 0;
      await ctx.fx.returnToDeck(toTop ? [...rest].reverse() : rest, { toTop });
    } else {
      if (rest.length > 1) {
        rest =
          (await ctx.ask.orderCards?.(ctx, {
            candidates: rest,
            visibleCards: revealed
              .filter((card) => rest.includes(card.instanceId))
              .map((card) => ({ instanceId: card.instanceId, cardId: card.cardId })),
            destination: action.rest === "deckTop" ? "deckTop" : "deckBottom",
          })) ?? rest;
      }
      const toTop = action.rest === "deckTop";
      await ctx.fx.returnToDeck(toTop ? [...rest].reverse() : rest, { toTop });
    }
  };

  let restDisposed = false;
  // `reveal()` exposes cards in place at the top of the deck. Stage the unchosen
  // portion out of that deck before an effect-driven digivolution so its mandatory
  // bonus draw cannot take one of the revealed cards. `silent` is essential: this is
  // a transient reveal pool, not an effect adding cards to hand.
  if (toDigivolve.length > 0) {
    const restToStage = revealed.filter((card) => !taken.has(card.instanceId)).map((card) => card.instanceId);
    if (restToStage.length > 0) await ctx.fx.returnToHand(restToStage, { silent: true });
  }
  // Effect-driven "digivolve into a revealed card" resolves its bonus draw before
  // returning the remaining reveal pool, which keeps that draw restricted to the
  // unrevealed deck. The primitive invokes the callback before it opens the evolved
  // card's [When Digivolving] window, so the returned cards are no longer visible
  // to that window.
  for (const pending of toDigivolve) {
    const revealedCard = revealed.find((card) => card.instanceId === pending.instanceId);
    if (revealedCard === undefined) continue;
    const into = ctx.game.definitionOf(revealedCard);
    const target = pending.target ?? { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 };
    const targets = await resolvePermanentTargets(ctx, target, {
      eligible: (permanentId) => {
        const permanent = ctx.game.permanentById(permanentId);
        if (permanent?.topCard === undefined) return false;
        const base = ctx.game.definitionOf(permanent.topCard);
        return (
          matchingEvoCost(into, base) !== undefined ||
          matchingAlternateDigivolutionRequirement(into, base) !== undefined
        );
      },
    });
    if (targets.length === 0) continue;
    await ctx.fx.returnToHand([pending.instanceId], { silent: true });
    await ctx.fx.digivolveFromInstance(targets[0]!, pending.instanceId, {
      payCost: pending.payCost ?? false,
      draw: true,
      beforeWhenDigivolving: async () => {
        if (restDisposed) return;
        restDisposed = true;
        await disposeRest();
      },
    });
  }
  if (!restDisposed) await disposeRest();
}

/**
 * BT14-067-style reveal-reference budget:
 * opponent reveals top N, controller chooses one revealed Digimon card, deletes
 * opponent Digimon whose total printed play cost is <= the chosen card's play cost,
 * then returns the revealed pool to top or bottom of the revealed player's deck.
 */
export async function runRevealChooseDeleteBudget(
  ctx: EffectContext,
  action: Extract<Action, { kind: "RevealChooseDeleteBudget" }>,
): Promise<void> {
  const ownerSeat = ctx.source.ownerSeat;
  const revealSeat = action.revealController === "opponent" ? ctx.game.opponentOf(ownerSeat) : ownerSeat;
  const revealed = await ctx.fx.reveal(revealSeat, action.revealCount);
  if (revealed.length === 0) {
    ctx.lastDeleteCount = 0;
    return;
  }
  ctx.lastRevealedCards = revealed.map((card) => ({
    instanceId: card.instanceId,
    cardId: card.cardId,
    ownerSeat: card.ownerSeat,
  }));

  const visible = revealed.map((card) => card.instanceId);
  const referenceCandidates = revealed.filter((card) =>
    definitionMatches(action.chooseFilter, ctx.game.definitionOf(card)),
  );
  if (referenceCandidates.length > 0) {
    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: referenceCandidates.map((card) => card.instanceId),
      visible,
      visibleCards: revealed.map((card) => ({
        instanceId: card.instanceId,
        cardId: card.cardId,
      })),
      min: 1,
      max: 1,
    });
    const reference = referenceCandidates.find((card) => card.instanceId === chosen[0]);
    const budget = reference !== undefined ? (ctx.game.definitionOf(reference).playCost ?? 0) : 0;
    const candidates = candidatePermanents(ctx, {
      filter: action.deleteFilter,
      count: "all",
    } as Target);
    if (action.deleteCount !== undefined) {
      const eligible = candidates.filter((permanent) => {
        const cost = permanent.topCard !== undefined ? (ctx.game.definitionOf(permanent.topCard).playCost ?? 0) : 0;
        return cost <= budget;
      });
      const max = Math.min(action.deleteCount, eligible.length);
      const min = action.upTo ? 0 : max;
      const chosenTargets =
        max > 0
          ? await ctx.ask.chooseTargets(ctx, {
              candidates: eligible.map((permanent) => permanent.permanentId),
              min,
              max,
            })
          : [];
      ctx.lastDeleteCount = chosenTargets.length > 0 ? await ctx.fx.deletePermanent(chosenTargets) : 0;
    } else {
      const byCost = candidates
        .map((permanent) => {
          const cost = permanent.topCard !== undefined ? (ctx.game.definitionOf(permanent.topCard).playCost ?? 0) : 0;
          return { permanentId: permanent.permanentId, cost };
        })
        .sort((a, b) => a.cost - b.cost);
      const selected: string[] = [];
      let spent = 0;
      for (const candidate of byCost) {
        if (spent + candidate.cost > budget) {
          if (action.upTo) continue;
          break;
        }
        const yes = action.upTo
          ? await ctx.ask.optional(
              ctx,
              `Delete ${candidate.permanentId} (cost ${candidate.cost}, spent ${spent}/${budget})?`,
            )
          : true;
        if (yes) {
          selected.push(candidate.permanentId);
          spent += candidate.cost;
        }
      }
      ctx.lastDeleteCount = selected.length > 0 ? await ctx.fx.deletePermanent(selected) : 0;
    }
  } else {
    ctx.lastDeleteCount = 0;
  }

  let ordered = visible;
  if (action.returnOrder === "controllerChoice" && visible.length > 1) {
    const chosenOrder = await ctx.ask.selectCards(ctx, {
      candidates: visible,
      visible,
      visibleCards: revealed.map((card) => ({
        instanceId: card.instanceId,
        cardId: card.cardId,
      })),
      min: visible.length,
      max: visible.length,
    });
    if (chosenOrder.length === visible.length) ordered = chosenOrder;
  }

  if (action.returnRevealed === "trash") {
    await ctx.fx.trash(ordered, { byEffectSeat: ctx.source.ownerSeat });
  } else if (action.returnRevealed === "deckTopOrBottom") {
    const choice = await ctx.ask.chooseOption(ctx, ["Top of deck", "Bottom of deck"]);
    const toTop = choice === 0;
    await ctx.fx.returnToDeck(toTop ? [...ordered].reverse() : ordered, { toTop });
  } else {
    const toTop = action.returnRevealed === "deckTop";
    await ctx.fx.returnToDeck(toTop ? [...ordered].reverse() : ordered, { toTop });
  }
}

export async function runRevealAction(ctx: EffectContext, action: Action): Promise<boolean> {
  switch (action.kind) {
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
    default:
      // Unreachable: runAction routes only this family's kinds here, and its own default
      // reports anything the Action union does not cover.
      return false;
  }
}
