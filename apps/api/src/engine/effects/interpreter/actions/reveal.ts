// Revealing cards and dispatching what the controller takes from them.

import { matchingAlternateDigivolutionRequirement, matchingEvoCost } from "../../../cards/cardData.js";
import type { EffectContext } from "../../EffectContext.js";
import { unsupported } from "../errors.js";
import { DefinitionFacts, definitionMatches } from "../matching/definition.js";
import { scaleFactor } from "../scaling.js";
import { permanentMatchesFilter } from "../matching/permanent.js";
import { type LooseCandidate, candidateLooseInstances, pickLoose } from "../targeting/loose.js";
import { candidatePermanents, effectiveTargetCount, resolvePermanentTargets } from "../targeting/permanents.js";
import { CardKind, isDigimon } from "@aegis/shared";
import type { Action, Filter, Target } from "@aegis/shared";

/** Cards whose rule text changes a static fact only while they are revealed from deck. */
export function revealedDefinition(ctx: EffectContext, card: import("@aegis/shared").CardInstance): DefinitionFacts {
  const def = ctx.game.definitionOf(card) as DefinitionFacts;
  const withOmekamonAlias = card.cardId === "BT15-060" ? { nameAliases: ["Omnimon"] } : {};
  // BT17-068 is printed Lv5 and is also treated as Lv6 while revealed. Keep the
  // printed level available so effects such as BT3-051 can fill both slots with
  // two copies (KB Q2827), while retaining level 6 for level-gated effects.
  return card.cardId === "BT17-068"
    ? { ...def, level: 6, treatedAsLevels: [5, 6], ...withOmekamonAlias }
    : { ...def, ...withOmekamonAlias };
}

/**
 * Announce the hand cards a reveal exposed. A hand card is never synchronized to the
 * opponent, and it performs no zone movement here, so the event is the only thing that
 * makes the reveal public. Deck reveals narrate inside `fx.reveal` instead, which is the
 * one primitive every deck reveal goes through.
 */
function narrateHandReveal(
  ctx: EffectContext,
  candidates: readonly LooseCandidate[],
  chosenInstanceIds: readonly string[],
): void {
  for (const instanceId of chosenInstanceIds) {
    const card = candidates.find((candidate) => candidate.instanceId === instanceId);
    if (card !== undefined) ctx.fx.revealCard(card.ownerSeat, card.cardId, ctx.source.cardId);
  }
}

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
    const chosen = await pickLoose(ctx, target, candidates);
    narrateHandReveal(ctx, candidates, chosen);
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

export async function runHandRevealAdd(
  ctx: EffectContext,
  action: Extract<Action, { kind: "HandRevealAdd" }>,
): Promise<void> {
  const candidates = candidateLooseInstances(ctx, action.target, ["hand"]);
  const chosen = await pickLoose(ctx, action.target, candidates);
  if (chosen.length === 0) return;
  const card = candidates.find((candidate) => candidate.instanceId === chosen[0]);
  if (card === undefined) return;
  narrateHandReveal(ctx, candidates, chosen);
  const definition = ctx.game.definitionOf({ cardId: card.cardId } as never);
  if (definitionMatches(action.securityFilter, definition)) {
    await ctx.fx.addSecurity(ctx.source.ownerSeat, chosen, { toTop: action.toTop ?? true, faceUp: false });
  }
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
  ctx.lastEffectActed = false;
  let seat = ctx.source.ownerSeat;
  if (action.controller === "opponent") {
    seat = ctx.game.opponentOf(ctx.source.ownerSeat);
  } else if (action.controller === "any") {
    const choice = await ctx.ask.chooseOption(ctx, ["Your deck", "Opponent's deck"]);
    seat = choice === 0 ? ctx.source.ownerSeat : ctx.game.opponentOf(ctx.source.ownerSeat);
  }
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
  const toPlay: { instanceId: string; costDelta?: number; suspended?: boolean }[] = [];
  const toUseOption: { instanceId: string; costDelta?: number; payCost?: boolean }[] = [];
  const toDigivolve: { instanceId: string; target?: Target; payCost?: boolean }[] = [];
  const toSecurity: { instanceId: string; toTop: boolean; faceDown: boolean }[] = [];
  const toPlaceUnder: { instanceId: string; underFilter?: import("@aegis/shared").Filter; faceDown?: boolean }[] = [];
  const toUnderTamer: { instanceId: string; underFilter?: import("@aegis/shared").Filter; faceDown?: boolean }[] = [];
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
  // RevealAdd candidates are loose cards rather than permanents, so the normal
  // permanent matcher cannot resolve a dynamic play-cost ceiling. Materialize
  // the ceiling once per effect from the live source stack before matching the
  // revealed card definitions (EX9-053 and the later EX12 family).
  const materializePlayCostScaling = (filter: Filter): Filter => {
    const scaling = (filter as Filter & { playCostLteScaling?: import("@aegis/shared").Scaling }).playCostLteScaling;
    if (scaling === undefined) return filter;
    const cap = (filter.playCostLte ?? 0) + scaleFactor(ctx, scaling);
    const { playCostLteScaling: _scaling, ...withoutScaling } = filter as Filter & {
      playCostLteScaling?: import("@aegis/shared").Scaling;
    };
    return { ...withoutScaling, playCostLte: cap } as Filter;
  };

  for (const spec of action.add) {
    if (spec.ifDigivolveDeclined === true && !digivolveDeclined) continue;
    const primaryFilter = materializePlayCostScaling(spec.filter);
    const alternativeFilters = (spec.orFilters ?? []).map(materializePlayCostScaling);
    const qualifies = (c: import("@aegis/shared").CardInstance) => {
      const def = revealedDefinition(ctx, c);
      // "Add 1 [X] or 1 Y card among them": a card qualifies under EITHER alternative;
      // `count` is the total across the union, so the player adds 1 from either, not one each.
      return definitionMatches(primaryFilter, def) || alternativeFilters.some((alt) => definitionMatches(alt, def));
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
    const costBudget = spec.costBudget ?? spec.totalPlayCostBudget;
    if (costBudget !== undefined) {
      const budget = costBudget;
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
          toPlay.push({ instanceId: c.instanceId, suspended: spec.suspended });
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
        to?: "hand" | "trash" | "play" | "useOption" | "digivolve" | "placeUnder" | "underTamer" | "security";
        underFilter?: import("@aegis/shared").Filter;
        toTop?: boolean;
        faceDown?: boolean;
      } = { to: spec.to, underFilter: spec.underFilter, toTop: spec.toTop, faceDown: spec.faceDown };
      const alternatives = (spec.orDispositions ?? []).filter(
        (choice) => choice.filter === undefined || definitionMatches(choice.filter, revealedDefinition(ctx, c)),
      );
      if (alternatives.length > 0) {
        const definition = revealedDefinition(ctx, c);
        const choices = [disposition, ...alternatives].filter((choice) => {
          if (choice.to === "play") {
            return definition.kinds.includes(CardKind.Digimon) || definition.kinds.includes(CardKind.Tamer);
          }
          if (choice.to === "useOption") return definition.kinds.includes(CardKind.Option);
          return true;
        });
        const labels = choices.map((choice) => choice.to ?? "hand");
        const picked = choices.length > 1 ? await ctx.ask.chooseOption(ctx, labels) : 0;
        disposition = choices[picked] ?? disposition;
      }
      if (disposition.to === "play") {
        toPlay.push({ instanceId: c.instanceId, costDelta: spec.costDelta, suspended: spec.suspended });
      } else if (disposition.to === "useOption")
        toUseOption.push({ instanceId: c.instanceId, costDelta: spec.costDelta, payCost: spec.payCost });
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
        toPlaceUnder.push({
          instanceId: c.instanceId,
          underFilter: disposition.underFilter,
          faceDown: disposition.faceDown,
        });
      else if (disposition.to === "underTamer")
        toUnderTamer.push({
          instanceId: c.instanceId,
          underFilter: disposition.underFilter,
          faceDown: disposition.faceDown,
        });
      else toHand.push(c.instanceId);
    }
  }

  for (const selected of toSecurity) {
    await ctx.fx.addSecurity(seat, [selected.instanceId], {
      toTop: selected.toTop,
      faceUp: !selected.faceDown,
    });
  }
  if (toHand.length > 0) {
    await ctx.fx.returnToHand(toHand);
    // Follow-up clauses such as BT15-011's "If you added cards, trash 1 card in
    // your hand" read this receipt through ifThisEffectActed. RevealAdd used to
    // move the selected cards successfully while leaving the receipt false.
    ctx.lastEffectActed = true;
  }
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
    const freeReadyIds = toPlay
      .filter((p) => p.costDelta === undefined && p.suspended !== true)
      .map((p) => p.instanceId);
    const freeSuspendedIds = toPlay
      .filter((p) => p.costDelta === undefined && p.suspended === true)
      .map((p) => p.instanceId);
    const reducedGroups = new Map<string, { costDelta: number; suspended: boolean; ids: string[] }>();
    for (const p of toPlay) {
      if (p.costDelta === undefined) continue;
      const key = `${p.costDelta}:${p.suspended === true ? "suspended" : "ready"}`;
      const group = reducedGroups.get(key) ?? {
        costDelta: p.costDelta,
        suspended: p.suspended === true,
        ids: [],
      };
      group.ids.push(p.instanceId);
      reducedGroups.set(key, group);
    }
    // Effect-played cards must open their own [On Play] window and `whenPlayed` bus.
    // `playFromHand` is the legacy placement-only primitive; `playInstances` owns the
    // complete effect-play lifecycle (ST13-02 revealing ST13-09, and the wider reveal-play
    // family). The revealed cards were staged into hand above solely to leave the reveal pool.
    if (freeReadyIds.length > 0) await ctx.fx.playInstances(freeReadyIds, { payCost: false });
    if (freeSuspendedIds.length > 0) {
      await ctx.fx.playInstances(freeSuspendedIds, { payCost: false, suspended: true });
    }
    for (const { costDelta, suspended, ids } of reducedGroups.values()) {
      // "With the play cost reduced by N" is not a free play. The old call omitted
      // `payCost:true`, silently waiving the remaining cost in every RevealAdd reduced-play.
      await ctx.fx.playInstances(ids, { payCost: true, costDelta, ...(suspended ? { suspended: true } : {}) });
    }
  }
  if (toUseOption.length > 0) {
    const optionIds = toUseOption.map((entry) => entry.instanceId);
    await ctx.fx.returnToHand(optionIds, { silent: true });
    for (const entry of toUseOption) {
      const card = ctx.game.definitionOf({
        cardId: revealed.find((item) => item.instanceId === entry.instanceId)!.cardId,
      } as never);
      // An Option used from the reveal can digivolve as part of its Main effect. Its bonus draw
      // must skip the still-revealed remainder, just like the direct reveal-digivolve path below
      // (BT26-084/BT26-102 Q7127), then the remainder is returned after the Option finishes.
      const revealedRestIds = revealed.filter((item) => !taken.has(item.instanceId)).map((item) => item.instanceId);
      const digivolveFromInstance = ctx.fx.digivolveFromInstance.bind(ctx.fx);
      const optionContext = {
        ...ctx,
        fx: {
          ...ctx.fx,
          digivolveFromInstance: (
            targetPermanentId: Parameters<typeof digivolveFromInstance>[0],
            sourceInstanceId: Parameters<typeof digivolveFromInstance>[1],
            opts: Parameters<typeof digivolveFromInstance>[2],
          ) =>
            opts?.draw === false
              ? digivolveFromInstance(targetPermanentId, sourceInstanceId, opts)
              : digivolveFromInstance(targetPermanentId, sourceInstanceId, {
                  ...opts,
                  draw: false,
                  beforeWhenDigivolving: async () => {
                    await ctx.fx.draw(ctx.source.ownerSeat, 1, { excludeInstanceIds: revealedRestIds });
                    await opts?.beforeWhenDigivolving?.();
                  },
                }),
        },
      };
      await ctx.fx.useOptionFromHand(optionContext, entry.instanceId, card.playCost, {
        payCost: entry.payCost !== false,
        costDelta: entry.costDelta,
      });
    }
    ctx.lastEffectActed = toUseOption.length > 0;
  }
  // "place N [X] as the bottom digivolution card of one of your [Y] Digimon"
  if (toPlaceUnder.length > 0) {
    let placedAny = false;
    for (const { instanceId, underFilter, faceDown } of toPlaceUnder) {
      const candidates = ctx.game.player(seat).battleArea.filter((p) => {
        if (!p.topCard || (underFilter === undefined && !isDigimon(ctx.game.definitionOf(p.topCard)))) return false;
        return underFilter === undefined || permanentMatchesFilter(ctx, p, underFilter, ctx.source);
      });
      if (candidates.length === 0) {
        // No legal host; return to deck bottom (the effect can't fire without a valid host).
        await ctx.fx.returnToDeck([instanceId], { toTop: false, suppressWhenEffectAddsToDeck: true });
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
      const placed = await ctx.fx.placeUnder(hostPermanentId, [instanceId], {
        faceUp: faceDown === true ? false : undefined,
      });
      if ((placed?.length ?? 0) > 0) placedAny = true;
    }
    if (placedAny) ctx.lastEffectActed = true;
  }
  // "place N [X] under one of your Tamer permanents" (BT19-055 `to:"underTamer"`):
  // controller chooses which of their Tamer permanents receives the card.
  if (toUnderTamer.length > 0) {
    const tamerCandidates = ctx.game.player(seat).battleArea.filter((p) => {
      if (!p.topCard) return false;
      const topDef = ctx.game.definitionOf(p.topCard);
      return topDef.kinds.includes("Tamer" as never);
    });
    for (const { instanceId, underFilter, faceDown } of toUnderTamer) {
      const candidates = tamerCandidates.filter(
        (p) => underFilter === undefined || permanentMatchesFilter(ctx, p, underFilter, ctx.source),
      );
      if (candidates.length === 0) {
        await ctx.fx.returnToDeck([instanceId], { toTop: false, suppressWhenEffectAddsToDeck: true });
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
      await ctx.fx.placeUnder(hostPermanentId, [instanceId], { faceUp: faceDown === true ? false : undefined });
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
      await ctx.fx.returnToDeck(
        toTop ? [...rest].reverse() : action.reverseBottomOrder === true ? [...rest].reverse() : rest,
        { toTop, suppressWhenEffectAddsToDeck: true },
      );
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
      await ctx.fx.returnToDeck(
        toTop ? [...rest].reverse() : action.reverseBottomOrder === true ? [...rest].reverse() : rest,
        { toTop, suppressWhenEffectAddsToDeck: true },
      );
    }
  };

  let restDisposed = false;
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
      draw: false,
      beforeWhenDigivolving: async () => {
        const remainingIds = new Set(
          revealed.filter((card) => !taken.has(card.instanceId)).map((card) => card.instanceId),
        );
        // The digivolution bonus draw comes from the unrevealed portion of the deck
        // while the revealed remainder is still set aside (EX2-072 Q3363).
        await ctx.fx.draw(ctx.source.ownerSeat, 1, { excludeInstanceIds: [...remainingIds] });
        if (!restDisposed) {
          await disposeRest();
          restDisposed = true;
        }
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
    definitionMatches(action.chooseFilter, revealedDefinition(ctx, card)),
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
    await ctx.fx.returnToDeck(toTop ? [...ordered].reverse() : ordered, {
      toTop,
      suppressWhenEffectAddsToDeck: true,
    });
  } else {
    const toTop = action.returnRevealed === "deckTop";
    await ctx.fx.returnToDeck(toTop ? [...ordered].reverse() : ordered, {
      toTop,
      suppressWhenEffectAddsToDeck: true,
    });
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
          definitionMatches(definitionFilter, revealedDefinition(ctx, card)),
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
        ctx.fx.shuffleSecurity(ctx.source.ownerSeat);
        return false;
      }
      const played = await ctx.fx.playInstances(selectedIds, { payCost: action.then.payCost });
      ctx.lastPlayedPermanentIds = (played ?? []).map((permanent) => permanent.permanentId);
      ctx.lastEffectActed = ctx.lastPlayedPermanentIds.length > 0;
      ctx.fx.shuffleSecurity(ctx.source.ownerSeat);
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
    case "HandRevealAdd": {
      await runHandRevealAdd(ctx, action);
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
