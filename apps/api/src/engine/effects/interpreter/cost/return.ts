import { requireOpponentAsk } from "../../../decisions/decisionApi.js";
import type { EffectContext } from "../../EffectContext.js";
import { LooseCandidate, candidateLooseInstances, pickLoose } from "../targeting/loose.js";
import { resolvePermanentTargets, topInstanceIds } from "../targeting/permanents.js";
import { bindLooseCostSelection } from "./candidates.js";
import type { Cost, Target, ZoneRef } from "@aegis/shared";

/**
 * `cost.trackColors` asks the cost to record how many distinct colors the paid
 * cards carried, for a later clause to read back off `ctx.namedCounts`.
 */
function recordTrackedColors(
  ctx: EffectContext,
  cost: Cost,
  candidates: LooseCandidate[],
  chosen: readonly string[],
): void {
  if (cost.trackColors === undefined) return;
  const colors = new Set<string>();
  for (const candidate of candidates) {
    if (!chosen.includes(candidate.instanceId)) continue;
    for (const color of ctx.game.definitionOf({ cardId: candidate.cardId } as never).colors) colors.add(color);
  }
  ctx.namedCounts ??= new Map();
  ctx.namedCounts.set(cost.trackColors, colors.size);
}

/**
 * Pay a `return` cost: send cards or permanents back to hand, deck or egg deck.
 */
export async function payReturnCost(ctx: EffectContext, cost: Cost, out?: { paidCount: number }): Promise<boolean> {
  if (!cost.target) return false;
  const returnToTop = async (): Promise<boolean> => {
    if (cost.to === "deckTopOrBottom") {
      return (await ctx.ask.chooseOption(ctx, ["Top of deck", "Bottom of deck"])) === 0;
    }
    if (cost.to === "deckTop") return true;
    return /\bto the top\b/i.test(cost.raw ?? "");
  };
  // Trash effects can pay "by returning this card" while the source is a loose card,
  // not a battle-area permanent. Resolve that exact physical instance before the generic
  // permanent-target branch (BT23-097).
  if (cost.target.filter.isSelfRef === true && ctx.source.permanent() === undefined) {
    const inTrash = ctx.game
      .player(ctx.source.ownerSeat)
      .trash.some((card) => card.instanceId === ctx.source.instanceId);
    if (!inTrash || cost.to === "hand") return false;
    await ctx.fx.returnToDeck([ctx.source.instanceId], { toTop: await returnToTop() });
    if (out) out.paidCount = 1;
    return true;
  }
  if (cost.target.filter.zone === "hand") {
    const candidates = candidateLooseInstances(ctx, cost.target, ["hand"]);
    const n =
      cost.leaveInZone !== undefined
        ? Math.max(0, candidates.length - cost.leaveInZone)
        : cost.target.count === "all"
          ? candidates.length
          : cost.target.count;
    if (n <= 0 || candidates.length < n) return false;
    let chosen = await pickLoose(
      ctx,
      { ...cost.target, count: n },
      candidates,
      undefined,
      ctx.ask,
      cost.selectionHidden === true ? [] : undefined,
    );
    if (chosen.length < n) return false;
    if (cost.ownerInspectsSelection === true) {
      const selectedCards = candidates
        .filter((candidate) => chosen.includes(candidate.instanceId))
        .map((candidate) => ({ instanceId: candidate.instanceId, cardId: candidate.cardId }));
      await requireOpponentAsk(ctx).selectCards(ctx, {
        candidates: [],
        min: 0,
        max: 0,
        visible: chosen,
        visibleCards: selectedCards,
      });
    }
    if (cost.orderReturnedCards === true && chosen.length > 1) {
      chosen =
        (await ctx.ask.orderCards?.(ctx, {
          candidates: chosen,
          ...(cost.selectionHidden === true
            ? {}
            : {
                visibleCards: candidates
                  .filter((candidate) => chosen.includes(candidate.instanceId))
                  .map((candidate) => ({ instanceId: candidate.instanceId, cardId: candidate.cardId })),
              }),
          destination: cost.to === "deckTop" ? "deckTop" : "deckBottom",
        })) ?? chosen;
    }
    // A hand card "returned" to hand moves nowhere, so such a cost is unpayable rather
    // than a silent deck return.
    if (cost.to === "hand") return false;
    await ctx.fx.returnToDeck(chosen, { toTop: await returnToTop() });
    if (out) out.paidCount = chosen.length;
    return true;
  }
  // Combined loose-zone return cost (for example, trash OR digivolution cards). Select
  // all-or-nothing from the pooled candidates; the explicit destination controls whether
  // the cards go to the regular deck top or the legacy Digi-Egg deck bottom.
  if (Array.isArray(cost.target.filter.zone) && cost.target.filter.zone.length > 1) {
    const zones = cost.target.filter.zone as ZoneRef[];
    const candidates = candidateLooseInstances(ctx, cost.target, zones);
    const n = cost.target.count === "all" ? candidates.length : cost.target.count;
    if (n <= 0 || candidates.length < n) return false;
    const chosen = await pickLoose(ctx, { ...cost.target, count: n }, candidates);
    if (chosen.length < n) return false;
    if (cost.to === "deckBottom" || cost.position === "bottom") {
      await ctx.fx.returnToDeck(chosen, { toTop: false });
    } else if (await returnToTop()) {
      await ctx.fx.returnToDeck(chosen, { toTop: true });
    } else {
      await ctx.fx.returnToEggDeck?.(chosen);
    }
    if (out) out.paidCount = chosen.length;
    return true;
  }
  if (cost.target.filter.zone === "battleArea" && cost.target.topCardOnly === true) {
    // This printed form names the visible top card of a permanent, but only its underlying
    // stack card is retained. Resolve the permanent with the stack-length eligibility before
    // selecting it, then detach its top via the shared primitive seam.
    const permanentIds = await resolvePermanentTargets(ctx, cost.target, {
      eligible: (permanentId) => (ctx.game.permanentById(permanentId)?.stack.length ?? 0) > 0,
    });
    const n = cost.target.count === "all" ? permanentIds.length : cost.target.count;
    if (n <= 0 || permanentIds.length < n) return false;
    const topIds = topInstanceIds(ctx, permanentIds);
    if (topIds.length < n) return false;
    const moved = await ctx.fx.returnToHand(topIds, {
      detachPermanentTop: true,
      byEffectSeat: ctx.source.ownerSeat,
    });
    if (out) out.paidCount = moved.length;
    return moved.length >= n;
  }
  // Stack-card return cost ("by returning 2 [Vemmon] from that Digimon's digivolution
  // cards to the bottom of the deck", BT18-092): these are loose stack instances, not
  // battle-area permanent top cards. Resolve them through the loose-card path so
  // returnToDeck can remove the selected stack cards from their hosts.
  if (cost.target.filter.zone === "digivolutionCards") {
    let candidates = candidateLooseInstances(ctx, cost.target, ["digivolutionCards"]);
    const n = cost.target.count === "all" ? candidates.length : cost.target.count;
    if (n <= 0 || candidates.length < n) return false;
    if (cost.target.filter.sameHost === true) {
      const byHost = new Map<string, LooseCandidate[]>();
      for (const candidate of candidates) {
        if (candidate.hostPermanentId === undefined) continue;
        const group = byHost.get(candidate.hostPermanentId) ?? [];
        group.push(candidate);
        byHost.set(candidate.hostPermanentId, group);
      }
      const eligibleHosts = [...byHost.entries()].filter(([, group]) => group.length >= n);
      if (eligibleHosts.length === 0) return false;
      const hostId =
        eligibleHosts.length === 1
          ? eligibleHosts[0]![0]
          : (
              await ctx.ask.chooseTargets(ctx, {
                candidates: eligibleHosts.map(([id]) => id),
                min: 1,
                max: 1,
              })
            )[0];
      if (hostId === undefined) return false;
      candidates = byHost.get(hostId) ?? [];
    }
    const chosen = await pickLoose(ctx, { ...cost.target, count: n }, candidates);
    if (chosen.length < n) return false;
    // Some generated return costs encode the destination as `position: "bottom"`
    // (rather than the legacy `to: "deckBottom"`). Preserve that distinction here:
    // EX6-073's seven distinct-name self-stack payment must actually bottom-deck the
    // selected cards, while `pickLoose` enforces the distinct-name constraint.
    if (cost.to === "deckBottom" || cost.position === "bottom") {
      await ctx.fx.returnToDeck(chosen, { toTop: false });
    } else {
      await ctx.fx.returnToHand(chosen);
    }
    if (out) out.paidCount = chosen.length;
    return true;
  }
  if (cost.target.filter.zone === "security") {
    const candidates = candidateLooseInstances(ctx, cost.target, ["security"]);
    const n = cost.target.count === "all" ? candidates.length : cost.target.count;
    if (n <= 0 || candidates.length < n) return false;
    const chosen = await pickLoose(ctx, { ...cost.target, count: n }, candidates);
    if (chosen.length < n) return false;
    await ctx.fx.returnToDeck(chosen, { toTop: await returnToTop() });
    if (out) out.paidCount = chosen.length;
    return true;
  }
  // Trash-zone return cost ("by returning 1 [Apocalymon] from your trash to the bottom of the
  // deck", BT17-068): resolve the loose trash cards matching the filter and return them to the
  // deck (bottom unless the raw says "top"). The prose compiler leaves the zone in the raw
  // (not filter.zone), so detect either. All-or-nothing — fewer than N available => unmet.
  if (cost.target.filter.zone === "trash" || /\btrash\b/i.test(cost.raw ?? "")) {
    // "all" means "pay with every matching candidate", i.e. n = candidates.length —
    // NOT Infinity (a finite pool is never >= Infinity, which made every "all"-shaped
    // cost unpayable; engine-audit finding 6). An empty pool is unpayable outright.
    const candidates = candidateLooseInstances(ctx, cost.target, ["trash"]);
    if (cost.target.distinctLevels === true || cost.target.distinctNames === true) {
      const groups = new Map<string, LooseCandidate[]>();
      for (const candidate of candidates) {
        const def = ctx.game.definitionOf({ cardId: candidate.cardId } as never);
        const key =
          cost.target.distinctLevels === true
            ? def.level !== undefined && def.level > 0
              ? String(def.level)
              : undefined
            : (def.nameEn ?? candidate.cardId).toLowerCase();
        if (key === undefined) continue;
        const group = groups.get(key) ?? [];
        group.push(candidate);
        groups.set(key, group);
      }
      const want = cost.target.count === "all" ? groups.size : cost.target.count;
      if (want <= 0 || groups.size < want) return false;
      const chosen: string[] = [];
      for (const group of [...groups.values()].slice(0, want)) {
        if (group.length === 1) {
          chosen.push(group[0]!.instanceId);
          continue;
        }
        const picked = await ctx.ask.selectCards(ctx, {
          candidates: group.map((c) => c.instanceId),
          min: 1,
          max: 1,
        });
        const id = picked[0];
        if (id === undefined) return false;
        chosen.push(id);
      }
      await ctx.fx.returnToDeck(chosen, { toTop: await returnToTop() });
      bindLooseCostSelection(ctx, cost.bindResultAs, candidates, chosen);
      // The "all distinct levels/names" pool is only known at pay time, so a dependent
      // `scaling: { unit: "namedCount" }` reads the count from here (BT18-019 gains 1
      // memory per returned level), exactly as the place and hand branches do.
      if (cost.trackCount !== undefined) {
        ctx.namedCounts ??= new Map();
        ctx.namedCounts.set(cost.trackCount, chosen.length);
      }
      if (out) out.paidCount = chosen.length;
      return true;
    }
    if (cost.target.upTo === true) {
      const max = typeof cost.target.count === "number" ? cost.target.count : candidates.length;
      const cap = Math.min(max, candidates.length);
      const min = (cost.target as Target & { allowZero?: boolean }).allowZero === true ? 0 : 1;
      if (cap < min) return false;
      let chosen = await ctx.ask.selectCards(ctx, {
        candidates: candidates.map((candidate) => candidate.instanceId),
        min,
        max: cap,
      });
      if (chosen.length < min) return false;
      if (chosen.length > 1) {
        chosen =
          (await ctx.ask.orderCards?.(ctx, {
            candidates: chosen,
            visibleCards: candidates
              .filter((candidate) => chosen.includes(candidate.instanceId))
              .map((candidate) => ({ instanceId: candidate.instanceId, cardId: candidate.cardId })),
            destination: /to the top/i.test(cost.raw ?? "") ? "deckTop" : "deckBottom",
          })) ?? chosen;
      }
      const toTop = await returnToTop();
      await ctx.fx.returnToDeck(toTop ? [...chosen].reverse() : chosen, { toTop });
      bindLooseCostSelection(ctx, cost.bindResultAs, candidates, chosen);
      if (out) out.paidCount = chosen.length;
      return true;
    }
    const n = cost.target.count === "all" ? candidates.length : cost.target.count;
    if (n <= 0 || candidates.length < n) return false;
    let chosen = await ctx.ask.selectCards(ctx, {
      candidates: candidates.map((c) => c.instanceId),
      min: n,
      max: n,
    });
    if (chosen.length < n) return false;
    if (cost.orderReturnedCards === true && chosen.length > 1) {
      chosen =
        (await ctx.ask.orderCards?.(ctx, {
          candidates: chosen,
          visibleCards: candidates
            .filter((candidate) => chosen.includes(candidate.instanceId))
            .map((candidate) => ({ instanceId: candidate.instanceId, cardId: candidate.cardId })),
          destination: cost.to === "deckTop" ? "deckTop" : "deckBottom",
        })) ?? chosen;
    }
    ctx.lastReturnedColors = [
      ...new Set(
        candidates
          .filter((candidate) => chosen.includes(candidate.instanceId))
          .flatMap((candidate) => ctx.game.definitionOf({ cardId: candidate.cardId } as never).colors),
      ),
    ];
    recordTrackedColors(ctx, cost, candidates, chosen);
    await ctx.fx.returnToDeck(chosen, { toTop: await returnToTop() });
    bindLooseCostSelection(ctx, cost.bindResultAs, candidates, chosen);
    if (out) out.paidCount = chosen.length;
    return true;
  }
  const permIds = await resolvePermanentTargets(ctx, cost.target);
  const ids = topInstanceIds(ctx, permIds);
  if (ids.length === 0) return false;
  // storeAs: record the returned Digimon's level so a later levelLte filter can reference it
  // (BT19-002 "returnedDigimonLevel" — the level of this card sets the cap on the bounce target).
  if (cost.storeAs !== undefined) {
    const perm = ctx.game.permanentById(permIds[0]!);
    const level = perm?.topCard ? ctx.game.definitionOf(perm.topCard).level : undefined;
    if (level !== undefined && level > 0) {
      if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
      ctx.namedCounts.set(cost.storeAs, level);
    }
  }
  // storeAsPlayCost: record the returned permanent's printed PLAY COST so a later
  // `namedCount` scaling can reference it — "play this card with the play cost reduced by
  // the play cost of the returned Tamer" (LM-006). A -1 sentinel (Digi-Egg) floors at 0.
  if (cost.storeAsPlayCost !== undefined) {
    const returned = ctx.game.permanentById(permIds[0]!);
    const playCost = returned?.topCard ? ctx.game.definitionOf(returned.topCard).playCost : undefined;
    if (playCost !== undefined) {
      if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
      ctx.namedCounts.set(cost.storeAsPlayCost, Math.max(0, playCost));
    }
  }
  if (cost.to === "deckBottom") {
    await ctx.fx.returnToDeck(ids, { toTop: false });
  } else {
    await ctx.fx.returnToHand(ids);
  }
  return true;
}
