import type { EffectContext } from "../../EffectContext.js";
import { definitionMatches } from "../matching/definition.js";
import { bottomFaceDownCostStacks } from "../targeting/faceDownCosts.js";
import { LooseCandidate, pickLoose } from "../targeting/loose.js";
import { candidatePermanents, resolvePermanentTargets } from "../targeting/permanents.js";
import { playEffectInstances } from "../actions/effectPlayAssembly.js";
import { CardKind } from "@aegis/shared";
import type { Cost } from "@aegis/shared";

/**
 * Pay by trashing the top card of the breeding area.
 */
export async function payTrashBreedingCost(ctx: EffectContext): Promise<boolean> {
  const breeding = ctx.game.player(ctx.source.ownerSeat).breeding;
  if (breeding?.topCard === undefined) return false;
  const definition = ctx.game.definitionOf(breeding.topCard);
  if (!definition.kinds.includes(CardKind.Digimon) && !definition.kinds.includes(CardKind.DigiEgg)) return false;
  const moved = await ctx.fx.trashBreedingPermanent?.(ctx.source.ownerSeat, {
    byEffectSeat: ctx.source.ownerSeat,
  });
  return (moved?.length ?? 0) > 0;
}

/**
 * Pay by trashing the bottom face-down card under a Tamer or Digimon.
 */
export async function payTrashBottomFaceDownCost(ctx: EffectContext, cost: Cost): Promise<boolean> {
  const stacks = bottomFaceDownCostStacks(ctx, cost);
  const count = cost.count ?? 1;
  const available = stacks.reduce((total, { cards }) => total + cards.length, 0);
  if (available < count) return false;
  const chosen: { hostId: string; instanceId: string }[] = [];
  // Choose the complete payment before moving anything. A player may take more
  // than one card from one host, but cannot skip its lower face-down card.
  while (chosen.length < count) {
    const candidates = stacks.flatMap(({ host, cards }) => {
      const next = cards.find((card) => !chosen.some((entry) => entry.instanceId === card.instanceId));
      return next === undefined
        ? []
        : [
            {
              hostId: host.permanentId,
              instanceId: next.instanceId,
              selectionId: cost.kind === "trashBottomFaceDownUnderTamer" ? host.topCard!.instanceId : next.instanceId,
            },
          ];
    });
    const needed = count - chosen.length;
    const forced = candidates.length === 1 || available - chosen.length === needed;
    const ids = forced
      ? candidates.slice(0, needed).map((candidate) => candidate.selectionId)
      : await ctx.ask.selectCards(ctx, {
          candidates: candidates.map((candidate) => candidate.selectionId),
          min: 1,
          max: Math.min(needed, candidates.length),
        });
    if (ids.length === 0 || ids.length > needed || new Set(ids).size !== ids.length) return false;
    const selected = ids.map((id) => candidates.find((candidate) => candidate.selectionId === id));
    if (selected.some((candidate) => candidate === undefined)) return false;
    for (const candidate of selected) if (candidate !== undefined) chosen.push(candidate);
  }
  const byHost = new Map<string, string[]>();
  for (const candidate of chosen) {
    byHost.set(candidate.hostId, [...(byHost.get(candidate.hostId) ?? []), candidate.instanceId]);
  }
  let movedCount = 0;
  for (const [hostId, ids] of byHost) {
    const moved = await ctx.fx.trashDigivolutionCards(hostId, ids, {
      byEffectSeat: ctx.source.ownerSeat,
      byEffectCardId: ctx.source.cardId,
    });
    movedCount += moved.length;
  }
  return movedCount === count;
}

/**
 * Pay by rotating a permanent's own top card to the bottom of its stack.
 */
export async function payPlaceOwnTopAtStackBottomCost(
  ctx: EffectContext,
  cost: Cost,
  out?: { paidCount: number },
): Promise<boolean> {
  if (!cost.target) return false;
  const candidates = (await resolvePermanentTargets(ctx, cost.target)).filter((id) => {
    const permanent = ctx.game.permanentById(id);
    return permanent !== undefined && permanent.stack.length > 0;
  });
  if (candidates.length === 0) return false;
  const selected =
    candidates.length === 1 ? candidates[0] : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];
  if (selected === undefined || !(await ctx.fx.placeOwnTopAtStackBottom(selected))) return false;
  ctx.pendingRotationHostPermanentId = selected;
  if (out) out.paidCount = 1;
  return true;
}

/**
 * Pay by playing a card out of a digivolution stack.
 */
export async function payPlayFromDigivolutionCardsCost(
  ctx: EffectContext,
  cost: Cost,
  out?: { paidCount: number },
): Promise<boolean> {
  // BT19-102: choose a Digimon, then choose a matching card from that Digimon's
  // digivolution cards and play it for free. The host selection is explicit rather
  // than inferred from the card filter because the subsequent Delete target is a
  // separate choice and may include a different permanent.
  if (!cost.target || !cost.hostTarget) return false;
  const hostCandidates = candidatePermanents(ctx, cost.hostTarget)
    .map((host) => host.permanentId)
    .filter((hostId) => {
      const host = ctx.game.permanentById(hostId);
      if (host === undefined || host.topCard === undefined) return false;
      const hostLevel = ctx.game.definitionOf(host.topCard).level;
      return host.stack.some((card) => {
        const definition = ctx.game.definitionOf({ cardId: card.cardId } as never);
        return (
          definitionMatches(cost.target!.filter, definition) &&
          (cost.sameLevelAsHost !== true || definition.level === hostLevel)
        );
      });
    });
  if (hostCandidates.length === 0) return false;
  const hostId =
    hostCandidates.length === 1
      ? hostCandidates[0]
      : (await ctx.ask.chooseTargets(ctx, { candidates: hostCandidates, min: 1, max: 1 }))[0];
  if (hostId === undefined) return false;
  const host = ctx.game.permanentById(hostId);
  if (host === undefined) return false;
  const hostLevel = host.topCard === undefined ? undefined : ctx.game.definitionOf(host.topCard).level;
  const candidates: LooseCandidate[] = host.stack
    .map((card) => ({
      instanceId: card.instanceId,
      cardId: card.cardId,
      ownerSeat: card.ownerSeat,
      hostPermanentId: host.permanentId,
      faceUp: card.faceUp,
    }))
    .filter((candidate) => {
      const definition = ctx.game.definitionOf({ cardId: candidate.cardId } as never);
      return (
        definitionMatches(cost.target!.filter, definition) &&
        (cost.sameLevelAsHost !== true || definition.level === hostLevel)
      );
    });
  const chosen = await pickLoose(ctx, { ...cost.target, count: 1 }, candidates);
  if (chosen.length !== 1) return false;
  const chosenCards = candidates.filter((candidate) => chosen.includes(candidate.instanceId));
  const played = await playEffectInstances(ctx, chosenCards, { payCost: false });
  if (played.length === 0) return false;
  if (cost.bindResultAs !== undefined) {
    ctx.boundPlayed ??= new Map();
    ctx.boundPlayed.set(cost.bindResultAs, new Set(played.map((permanent) => permanent.permanentId)));
    ctx.boundCardInstances ??= new Map();
    ctx.boundCardInstances.set(cost.bindResultAs, new Set(chosen));
  }
  ctx.lastResolvedPermanentIds = [hostId];
  if (out) out.paidCount = played.length;
  return true;
}
