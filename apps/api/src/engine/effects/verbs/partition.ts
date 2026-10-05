import type { Permanent, Seat } from "@aegis/shared";
import { partitionClauseMatches, partitionSpecOf, type PartitionClause } from "../../combat/keywords.js";
import type { RemovalCause } from "../EffectContext.js";
import type { PrimitivesContext } from "./context.js";

function matchPartitionSources(
  clauses: readonly PartitionClause[],
  sources: readonly Permanent["stack"][number][],
): string[] | undefined {
  if (clauses.length === 0) return [];
  for (const [index, source] of sources.entries()) {
    if (!partitionClauseMatches(clauses[0]!, source.cardId)) continue;
    const rest = matchPartitionSources(
      clauses.slice(1),
      sources.filter((_, sourceIndex) => sourceIndex !== index),
    );
    if (rest !== undefined) return [source.instanceId, ...rest];
  }
  return undefined;
}

/** Shared Partition source capture and replay for qualifying battle-area removals (§16-29). */
export function createPartitionReactions(pc: PrimitivesContext) {
  const { access, continuous, effectSeatStack, engine } = pc;

  function capture(
    permanentIds: readonly string[],
    cause: RemovalCause,
    resolvingSeat = effectSeatStack.at(-1) ?? engine.controllerSeat(),
  ) {
    return permanentIds
      .map((permanentId) => {
        if (cause === "byBattle") return undefined;
        const perm = access.permanentById(permanentId);
        if (perm === undefined || perm.topCard === undefined) return undefined;
        if (!continuous.hasKeyword(permanentId, "Partition")) return undefined;
        if (cause === "byEffect" && resolvingSeat === perm.controllerSeat) return undefined;
        const topSpec = partitionSpecOf(perm.topCard.cardId);
        const stackSource =
          topSpec === undefined ? perm.stack.find((card) => partitionSpecOf(card.cardId) !== undefined) : undefined;
        const spec = topSpec ?? (stackSource === undefined ? undefined : partitionSpecOf(stackSource.cardId));
        if (spec === undefined) return undefined;
        const matchedInstanceIds = matchPartitionSources(spec, perm.stack);
        if (matchedInstanceIds === undefined) return undefined;
        return {
          holderPermanentId: permanentId,
          seat: perm.controllerSeat,
          matchedInstanceIds,
          partitionSourceInstanceId: topSpec === undefined ? stackSource!.instanceId : perm.topCard.instanceId,
          partitionSourceCardId: topSpec === undefined ? stackSource!.cardId : perm.topCard.cardId,
          partitionSourceRole: topSpec === undefined ? ("stack" as const) : ("top" as const),
        };
      })
      .filter(
        (
          candidate,
        ): candidate is {
          holderPermanentId: string;
          seat: Seat;
          matchedInstanceIds: string[];
          partitionSourceInstanceId: string;
          partitionSourceCardId: string;
          partitionSourceRole: "top" | "stack";
        } => candidate !== undefined,
      );
  }

  function captureReturns(instanceIds: readonly string[], resolvingSeat?: Seat) {
    const permanentIds = instanceIds.flatMap((instanceId) => {
      const permanentId = pc.helpers.permanentByTopInstance(instanceId);
      if (
        permanentId === undefined ||
        pc.helpers.isRestricted(permanentId, "beReturned") ||
        pc.helpers.isRestricted(permanentId, "leaveBattleAreaExceptByDeletion")
      )
        return [];
      return [permanentId];
    });
    return capture(permanentIds, "byEffect", resolvingSeat);
  }

  async function resolve(candidates: ReturnType<typeof capture>, movedInstanceIds: readonly string[] = []) {
    for (const {
      holderPermanentId,
      seat,
      matchedInstanceIds,
      partitionSourceInstanceId,
      partitionSourceCardId,
      partitionSourceRole,
    } of candidates) {
      const survivingHolder = access.permanentById(holderPermanentId);
      const allMovedToLooseZone = matchedInstanceIds.every((id) => movedInstanceIds.includes(id));
      const partitionSourceStillInRole =
        partitionSourceRole === "top"
          ? survivingHolder?.topCard?.instanceId === partitionSourceInstanceId
          : survivingHolder?.stack.some((card) => card.instanceId === partitionSourceInstanceId) === true;
      const allStillUnderSurvivingHolder =
        survivingHolder !== undefined &&
        partitionSourceStillInRole &&
        matchedInstanceIds.every((id) => survivingHolder.stack.some((card) => card.instanceId === id));
      if (!allMovedToLooseZone && !allStillUnderSurvivingHolder) continue;
      const chosen = await engine.ask.selectInstances(
        seat,
        [matchedInstanceIds[0]!],
        0,
        1,
        "＜Partition＞: play the specified digivolution cards without paying their costs?",
        { sourceCardId: partitionSourceCardId, sourceInstanceId: partitionSourceInstanceId },
      );
      if (chosen.length === 0) continue;
      // Q2860: Partition plays from digivolution cards even after the holder's deletion trashed them.
      if (engine.playForKeywordEffect) {
        await engine.playForKeywordEffect(partitionSourceInstanceId, matchedInstanceIds, {
          playedFromZone: "digivolutionCards",
        });
      } else {
        await pc.fx.playInstances(matchedInstanceIds, { payCost: false, playedFromZone: "digivolutionCards" });
      }
    }
  }

  return { capture, captureReturns, resolve };
}
