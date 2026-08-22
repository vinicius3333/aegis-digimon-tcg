// Moving cards into and out of a digivolution stack.

import type { EffectContext } from "../../EffectContext.js";
import { relocateByEffect } from "../costs.js";
import { unsupported } from "../errors.js";
import { matchNameOrTrait } from "../matching/definition.js";
import { LooseCandidate, candidateLooseInstances, pickLoose } from "../targeting/loose.js";
import { candidatePermanents, resolvePermanentTargets } from "../targeting/permanents.js";
import type { Action, Target, ZoneRef } from "@aegis/shared";

/**
 * "Place [X] under <permanent>" / "place as the bottom digivolution card". The common
 * executable shape places filtered loose cards (from hand/trash) under the SOURCE
 * permanent. The self-placing shape ("place this card under 1 of your Digimon") is a
 * loud gap until the destination selection is modeled.
 */
export async function runPlaceUnder(
  ctx: EffectContext,
  action: Extract<Action, { kind: "PlaceUnder" }>,
): Promise<void> {
  const self = ctx.source.permanent();
  // "Place the top card of your Digi-Egg deck as this Digimon's bottom digivolution card"
  // (BT13-007 / EX6-006). The card source is the Digi-Egg deck (not loose cards), routed
  // through the dedicated primitive; the host is the SOURCE permanent. The primitive no-ops
  // when the Digi-Egg deck is empty (Q3694: the rest of the effect still resolves).
  if (action.fromEggDeck) {
    if (self === undefined) return;
    if (action.asTop) {
      // BT22-007: place the Digi-Egg-deck top as the host's TOP digivolution card (revealed), but
      // A non-matching top is left in the deck (Q4857: returned face down — i.e. unmoved).
      const top = ctx.game.player(ctx.source.ownerSeat).eggDeck?.[0];
      if (top === undefined) return;
      const filter = action.target.filter;
      if (filter.nameOrTrait !== undefined && filter.nameOrTrait.length > 0) {
        const def = ctx.game.definitionOf({ cardId: top.cardId } as never);
        if (!filter.nameOrTrait.some((ref) => matchNameOrTrait(def, ref))) return;
      }
      // The placement is "you may" — offer it; the controller may decline (Q4857).
      if (action.optional === true && !(await ctx.ask.optional(ctx, "Place as top digivolution card?"))) {
        return;
      }
      await ctx.fx.placeAsTopFromEggDeck(self.permanentId, ctx.source.ownerSeat);
      return;
    }
    await ctx.fx.placeUnderFromEggDeck(self.permanentId, ctx.source.ownerSeat);
    return;
  }
  // "Place [a battle-area permanent A] under another permanent B" (the cross-select
  // IPlacePermanentToDigivolutionCards form): relocating a whole permanent-with-stack under
  // another is a mechanic the placeUnder primitive (loose cards only) does not yet implement.
  // The IR captures it; execution is a loud gap until the relocate-permanent primitive exists.
  if (action.targetIsPermanent) {
    const sourceIds = await resolvePermanentTargets(ctx, action.target);
    if (sourceIds.length === 0) return;
    let destId: string | undefined;
    if (action.underSelectionRef && ctx.selections?.has(action.underSelectionRef)) {
      destId = ctx.selections.get(action.underSelectionRef);
    } else if (action.underFilter) {
      const destTarget: Target = { filter: action.underFilter, count: 1 };
      let destIds = (await resolvePermanentTargets(ctx, destTarget)).filter((id) => !sourceIds.includes(id));
      if (destIds.length === 0) {
        destIds = candidatePermanents(ctx, destTarget)
          .map((permanent) => permanent.permanentId)
          .filter((id) => !sourceIds.includes(id))
          .slice(0, 1);
      }
      if (destIds.length === 0) return;
      destId =
        destIds.length === 1
          ? destIds[0]
          : (await ctx.ask.chooseTargets(ctx, { candidates: destIds, min: 1, max: 1 }))[0];
    } else {
      unsupported(ctx, action, "PlaceUnder permanent relocation without underFilter/underSelectionRef");
      return;
    }
    if (destId === undefined) return;
    for (const sourcePermanentId of sourceIds) {
      await relocateByEffect(ctx, destId, sourcePermanentId, { belowTop: true });
    }
    return;
  }
  if (action.target?.isSelf || action.target?.filter?.isSelfRef) {
    // ＜Save＞ form: place THIS card under one of the controller's Tamers (chosen).
    // `underFilter` carries the destination predicate (mine, Tamer, non-Token).
    const underFilter = action.underFilter ?? {
      controller: "mine",
      kind: ["Tamer", "Digimon"],
      excludeToken: true,
    };
    if (underFilter) {
      // `lastPlayed`: the host is whatever this effect's own PlayWithoutCost just played
      // ("place this card as the PLAYED Digimon's bottom digivolution card" — EX9-005),
      // not a fresh choice among the controller's board.
      const destIds =
        action.underFilter?.lastPlayed === true
          ? (ctx.lastPlayedPermanentIds ?? [])
          : await resolvePermanentTargets(ctx, { filter: underFilter, count: 1 });
      if (destIds.length === 0) return;
      const chosen =
        destIds.length === 1 ? destIds : await ctx.ask.chooseTargets(ctx, { candidates: destIds, min: 1, max: 1 });
      if (chosen.length === 0) return;
      // When the source is a battle-area permanent, relocate the whole permanent
      // (top card + digivolution stack) under the chosen Tamer. The placeUnder
      // primitive only handles loose cards and cannot remove a permanent's top card.
      const sourcePerm = ctx.source.permanent();
      if (sourcePerm !== undefined) {
        await relocateByEffect(ctx, chosen[0]!, sourcePerm.permanentId, {
          belowTop: action.position !== "bottom",
        });
      } else {
        await ctx.fx.placeUnder(chosen[0]!, [ctx.source.instanceId], {
          belowTop: action.position !== "bottom",
        });
      }
      if (action.bindHostAs) {
        ctx.boundPlayed ??= new Map();
        ctx.boundPlayed.set(action.bindHostAs, new Set([chosen[0]!]));
      }
      return;
    }
    unsupported(ctx, action, "PlaceUnder of this card under a chosen permanent needs a destination selection");
    return;
  }
  // "Place the top card of your deck face down under this Tamer / under any of
  // your [TRAIT] Tamer" (ST23-13, ST24-03 etc.): take the top card of the
  // controller's main deck. When underFilter is set the controller picks a
  // destination permanent; otherwise the source permanent is the host.
  if (action.fromDeckTop) {
    const top = ctx.game.player(ctx.source.ownerSeat).deck[0];
    if (top === undefined) return;
    let destId: string | undefined;
    if (action.underFilter) {
      const destTarget: Target = { filter: action.underFilter, count: 1 };
      const destIds = await resolvePermanentTargets(ctx, destTarget);
      if (destIds.length === 0) return;
      destId =
        destIds.length === 1
          ? destIds[0]
          : (await ctx.ask.chooseTargets(ctx, { candidates: destIds, min: 1, max: 1 }))[0];
    } else if (self !== undefined) {
      destId = self.permanentId;
    }
    if (destId === undefined) return;
    await ctx.fx.placeUnder(destId, [top.instanceId], { belowTop: true, faceUp: false });
    return;
  }
  // Cards to place: loose cards matching the target filter.
  // Priority: action.from (top-level) > action.target.from > target.filter.zone (for non-default
  // zones like "underTamer" used by BT19-081) > legacy hand/trash/deck sweep.
  const zones: ZoneRef[] =
    (action.from?.length ?? 0) > 0
      ? (action.from as ZoneRef[])
      : (action.target.from?.length ?? 0) > 0
        ? (action.target.from as ZoneRef[])
        : action.target.filter.zone !== undefined
          ? [action.target.filter.zone]
          : ["hand", "trash", "deck"];
  const candidates = candidateLooseInstances(ctx, action.target, zones);
  if (candidates.length === 0) return;
  // Destination host (priority): explicit `destination` selector (BT19-038: place a card
  // from hand/trash under a chosen Tamer) > `underFilter` > the source permanent itself.
  let hostId: string | undefined;
  if (action.destination) {
    const destTarget: Target = { filter: action.destination.filter, count: action.destination.count };
    const destIds = await resolvePermanentTargets(ctx, destTarget);
    if (destIds.length === 0) return;
    hostId =
      destIds.length === 1
        ? destIds[0]
        : (await ctx.ask.chooseTargets(ctx, { candidates: destIds, min: 1, max: 1 }))[0];
  } else if (action.underSelectionRef && ctx.selections?.has(action.underSelectionRef)) {
    hostId = ctx.selections.get(action.underSelectionRef);
  } else if (action.underFilter?.isTriggerSource === true) {
    // `isTriggerSource: true` in underFilter resolves to the permanent that drove the
    // enclosing trigger: the Digimon being played for wouldBePlayed replacements, or
    // the Digimon that just digivolved for SubTrigger bodies such as BT12 Tamers.
    const triggerPermanentId =
      ctx.trigger?.wouldBePlayedInstanceId ??
      ctx.trigger?.subjectPermanentId ??
      ctx.trigger?.attackerPermanentId ??
      ctx.trigger?.deletedPermanentId;
    if (triggerPermanentId !== undefined) {
      const triggerPermanent = ctx.game.permanentById(triggerPermanentId);
      if (triggerPermanent !== undefined) hostId = triggerPermanent.permanentId;
    }
    if (hostId === undefined) return;
  } else if (action.underFilter) {
    const destTarget: Target = { filter: action.underFilter, count: 1 };
    const destIds = await resolvePermanentTargets(ctx, destTarget);
    if (destIds.length === 0) return;
    hostId =
      destIds.length === 1
        ? destIds[0]
        : (await ctx.ask.chooseTargets(ctx, { candidates: destIds, min: 1, max: 1 }))[0];
  } else {
    if (self === undefined) {
      unsupported(ctx, action, "PlaceUnder onto the source needs the source to be a battle-area permanent");
      return;
    }
    hostId = self.permanentId;
  }
  if (hostId === undefined) return;
  let chosen = await pickLoose(ctx, action.target, candidates, undefined, ctx.ask, candidates.map((candidate) => candidate.instanceId));
  if (action.order === "any" && chosen.length > 1 && ctx.ask.orderCards !== undefined) {
    chosen = await ctx.ask.orderCards(ctx, {
      candidates: chosen,
      visibleCards: chosen
        .map((instanceId) => candidates.find((candidate) => candidate.instanceId === instanceId))
        .filter((candidate): candidate is LooseCandidate => candidate !== undefined)
        .map(({ instanceId, cardId }) => ({ instanceId, cardId })),
      destination: "stackBottom",
    });
  }
  ctx.lastPlacedUnderInstanceIds = chosen;
  // `asDigiXrosMaterial: true` marks placed cards as DigiXros materials for the host Digimon.
  // The placeUnder primitive records them as material cards in the host's stack (belowTop as
  // the DigiXros convention; the flag is structural metadata for the DigiXros system to read).
  if (chosen.length > 0) {
    const placementIds = action.position === "bottom" && action.order === "any" ? [...chosen].reverse() : chosen;
    await ctx.fx.placeUnder(hostId, placementIds, { belowTop: action.position !== "bottom", faceUp: action.faceDown !== true });
  }
  if (action.bindHostAs && chosen.length > 0) {
    ctx.boundPlayed ??= new Map();
    ctx.boundPlayed.set(action.bindHostAs, new Set([hostId]));
  }
  // Bind the branch-acted result so an "if this effect placed" tail (AD1-020) can gate.
  ctx.lastEffectActed = chosen.length > 0;
  // Record the placed count so a later `namedCount` scaling can read it (EX6-015: "for each
  // card placed in this Digimon's digivolution cards, add 1 to the level this effect may return").
  if (action.trackCount !== undefined) {
    if (ctx.namedCounts === undefined) ctx.namedCounts = new Map();
    ctx.namedCounts.set(action.trackCount, chosen.length);
  }
}

/**
 * Preflight the ordinary loose-card PlaceUnder shape before an optional confirmation is
 * published. Specialized shapes own different source/destination rules and keep their
 * existing resolver-specific handling.
 */
export function canAttemptPlaceUnder(ctx: EffectContext, action: Extract<Action, { kind: "PlaceUnder" }>): boolean {
  if (
    action.fromEggDeck === true ||
    action.fromDeckTop === true ||
    action.targetIsPermanent === true ||
    action.target?.isSelf === true ||
    action.target?.filter?.isSelfRef === true
  ) {
    return true;
  }

  const zones: ZoneRef[] =
    (action.from?.length ?? 0) > 0
      ? (action.from as ZoneRef[])
      : (action.target.from?.length ?? 0) > 0
        ? (action.target.from as ZoneRef[])
        : action.target.filter.zone !== undefined
          ? [action.target.filter.zone]
          : ["hand", "trash", "deck"];
  if (candidateLooseInstances(ctx, action.target, zones).length === 0) return false;

  if (action.destination !== undefined) {
    return (
      candidatePermanents(ctx, {
        filter: action.destination.filter,
        count: action.destination.count,
      }).length > 0
    );
  }
  if (action.underSelectionRef !== undefined) {
    const hostId = ctx.selections?.get(action.underSelectionRef);
    return hostId !== undefined && ctx.game.permanentById(hostId) !== undefined;
  }
  if (action.underFilter?.isTriggerSource === true) {
    const triggerPermanentId =
      ctx.trigger?.wouldBePlayedInstanceId ??
      ctx.trigger?.subjectPermanentId ??
      ctx.trigger?.attackerPermanentId ??
      ctx.trigger?.deletedPermanentId;
    return triggerPermanentId !== undefined && ctx.game.permanentById(triggerPermanentId) !== undefined;
  }
  if (action.underFilter !== undefined) {
    return candidatePermanents(ctx, { filter: action.underFilter, count: 1 }).length > 0;
  }
  return ctx.source.permanent() !== undefined;
}

/**
 * "Trash the top/bottom digivolution card of <target>". Resolve the target permanents,
 * then for each take `amount` source cards from the top (last in `stack` — the card
 * directly beneath the top, which is the "top" digivolution card) or bottom (`stack`
 * front) and trash them via the trash verb (which can move a stack card to its owner's
 * trash). A permanent with no digivolution cards is unaffected.
 */
export async function runTrashDigivolution(
  ctx: EffectContext,
  action: Extract<Action, { kind: "TrashDigivolution" }>,
): Promise<boolean> {
  const amount = action.amount ?? 1;
  const fromTop = action.fromTop ?? true;

  // "acrossDigimon": pool all digivolution cards from every matching permanent and let
  // the controller pick `amount` from the combined pool (EX12-035 "any 4 digivolution
  // cards from your opponent's Digimon"). NOT routed through redirectDigivolutionTrashHosts:
  // no KB ruling describes how a pooled, individually-per-card selection across several hosts
  // collapses onto one reacting Digimon, so this scope is left outside BT10-084's redirect
  // rather than guessed at (residual — see BT10-084.ts).
  if (action.scope === "acrossDigimon") {
    const permanents = candidatePermanents(ctx, action.target);
    // Build a flat candidate list: each entry knows which host permanent it came from.
    const pool: { instanceId: string; permanentId: string }[] = [];
    for (const permanent of permanents) {
      for (const card of permanent.stack) {
        pool.push({ instanceId: card.instanceId, permanentId: permanent.permanentId });
      }
    }
    if (pool.length === 0) {
      ctx.lastEffectActed = false;
      return false;
    }
    if (
      action.optional === true &&
      action.abortOnDecline === true &&
      typeof amount === "number" &&
      pool.length < amount
    ) {
      ctx.lastEffectActed = false;
      return false;
    }
    const take = amount === "all" ? pool.length : Math.min(amount, pool.length);
    let chosen: string[];
    if (pool.length <= take) {
      chosen = pool.map((c) => c.instanceId);
    } else {
      chosen = await ctx.ask.selectCards(ctx, {
        candidates: pool.map((c) => c.instanceId),
        min: take,
        max: take,
      });
    }
    // Group chosen instance ids back to their host permanents, then trash per-host.
    const byHost = new Map<string, string[]>();
    for (const id of chosen) {
      const entry = pool.find((c) => c.instanceId === id);
      if (entry === undefined) continue;
      const bucket = byHost.get(entry.permanentId) ?? [];
      bucket.push(id);
      byHost.set(entry.permanentId, bucket);
    }
    for (const [pid, ids] of byHost) {
      if (ids.length > 0) await ctx.fx.trashDigivolutionCards(pid, ids, { byEffectSeat: ctx.source.ownerSeat });
    }
    ctx.lastEffectActed = chosen.length > 0;
    return amount === "all" ? chosen.length > 0 : chosen.length === amount;
  }

  // Default: single-target path — resolve 1 permanent, trash `amount` from its stack.
  const resolvedIds = await resolvePermanentTargets(ctx, action.target);
  if (resolvedIds.length === 0) {
    ctx.lastEffectActed = false;
    return false;
  }
  // Redirect BEFORE selecting which cards to take (KB BT10-084 Q2002-Q2008): a "would trash"
  // reaction may collapse this whole operation onto ONE reacting Digimon's stack instead. The
  // loop below then re-applies the SAME fromTop/choose/amount logic to whichever ids come back,
  // which is what preserves the original action's count and selection kind after a redirect.
  const permanentIds = await ctx.fx.redirectDigivolutionTrashHosts(resolvedIds);
  // An optional fixed-count action that gates the rest of its effect is an atomic
  // activation cost (for example BT5-111: "by trashing 2 ... end the attack").
  // If any selected host cannot supply the printed count, do not partially trash its
  // remaining cards and abort the payload. Mandatory trash effects still do as much as
  // possible, including after a BT10-084 redirect.
  if (
    action.optional === true &&
    action.abortOnDecline === true &&
    typeof amount === "number" &&
    permanentIds.some((pid) => (ctx.game.permanentById(pid)?.stack.length ?? 0) < amount)
  ) {
    ctx.lastEffectActed = false;
    return false;
  }
  // Per host permanent: which of its digivolution-stack cards this effect trashes. The
  // dedicated primitive trashes them AND fires whenDigivolutionTrashed (carrying the host as
  // subject) — a GENUINE effect-trash. A return-to-hand bounce clears digivolution cards via
  // returnToHand, a different path that never routes here, so it does not fire (KB P-004 Q4113).
  // Track the total cards actually trashed across every host so "this effect didn't trash"
  // (BT18-034, EX7-067's "then" clause) reads a real outcome instead of defaulting to unset.
  let totalTrashed = 0;
  for (const pid of permanentIds) {
    const permanent = ctx.game.permanentById(pid);
    if (permanent === undefined) continue;
    const stack = permanent.stack;
    const take = amount === "all" ? stack.length : Math.min(amount, stack.length);
    let ids: string[];
    if (action.choose === true) {
      // "trash any 1 card under [permanent]" (RB1-016, KB Q4094): the controller picks freely
      // from the whole stack rather than a deterministic top/bottom slice.
      const candidateIds = stack.map((card) => card.instanceId);
      ids =
        candidateIds.length <= take
          ? candidateIds
          : await ctx.ask.selectCards(ctx, { candidates: candidateIds, min: take, max: take });
    } else {
      ids = [];
      for (let i = 0; i < take; i++) {
        // `stack` is ordered bottom (index 0) -> top (last); the "top digivolution card"
        // is the most-recently-added source at the end.
        const idx = fromTop ? stack.length - 1 - i : i;
        const instance = stack[idx];
        if (instance !== undefined) ids.push(instance.instanceId);
      }
    }
    if (ids.length > 0) {
      await ctx.fx.trashDigivolutionCards(pid, ids, { byEffectSeat: ctx.source.ownerSeat });
      totalTrashed += ids.length;
    }
  }
  ctx.lastEffectActed = totalTrashed > 0;
  if (action.trackCount !== undefined) {
    ctx.namedCounts ??= new Map();
    ctx.namedCounts.set(action.trackCount, totalTrashed);
  }
  if (amount === "all") return totalTrashed > 0;
  return totalTrashed === amount * permanentIds.length;
}
