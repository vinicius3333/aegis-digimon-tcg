import type { Permanent, Seat } from "@aegis/shared";
import { partitionClauseMatches, partitionSpecOf, type PartitionClause } from "../../combat/keywords.js";
import type { RemovalCause } from "../EffectContext.js";
import type { EffectContext } from "../EffectContext.js";
import type { ReplacementSubscriptionInstead } from "../subtriggers.js";
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

/** A live Partition clause and the exact materials its declaration requires. */
function partitionCandidate(permanent: Permanent) {
  const topSpec = partitionSpecOf(permanent.topCard.cardId);
  const stackSource =
    topSpec === undefined
      ? permanent.stack.find((card) => card.faceUp && partitionSpecOf(card.cardId) !== undefined)
      : undefined;
  const spec = topSpec ?? (stackSource === undefined ? undefined : partitionSpecOf(stackSource.cardId));
  if (spec === undefined) return undefined;
  const matchedInstanceIds = matchPartitionSources(spec, permanent.stack);
  if (matchedInstanceIds === undefined) return undefined;
  return {
    holderPermanentId: permanent.permanentId,
    seat: permanent.controllerSeat,
    matchedInstanceIds,
    partitionSourceInstanceId: topSpec === undefined ? stackSource!.instanceId : permanent.topCard.instanceId,
    partitionSourceCardId: topSpec === undefined ? stackSource!.cardId : permanent.topCard.cardId,
    partitionSourceRole: topSpec === undefined ? ("stack" as const) : ("top" as const),
  };
}

/** CR 16-29-2: Partition competes with every other immediate would-leave effect. */
export function partitionLeaveReplacements(
  permanentIds: readonly string[],
  deps: {
    idOffset: number;
    permanentById(id: string): Permanent | undefined;
    hasPartition(id: string): boolean;
    select(ctx: EffectContext, candidate: NonNullable<ReturnType<typeof partitionCandidate>>): Promise<string[]>;
    play(sourceInstanceId: string, materialIds: string[]): Promise<unknown>;
  },
): ReplacementSubscriptionInstead[] {
  return permanentIds.flatMap((id, index) => {
    const permanent = deps.permanentById(id);
    if (permanent?.topCard === undefined || permanent.inBreeding || !deps.hasPartition(id)) return [];
    const candidate = partitionCandidate(permanent);
    if (candidate === undefined) return [];
    const stillAvailable = () => {
      const live = deps.permanentById(id);
      return (
        live !== undefined &&
        deps.hasPartition(id) &&
        (candidate.partitionSourceRole === "top"
          ? live.topCard.instanceId === candidate.partitionSourceInstanceId
          : live.stack.some((card) => card.instanceId === candidate.partitionSourceInstanceId)) &&
        candidate.matchedInstanceIds.every((material) => live.stack.some((card) => card.instanceId === material))
      );
    };
    return [
      {
        id: -(deps.idOffset + index + 1),
        event: "wouldLeavePlay" as const,
        mode: "instead" as const,
        sourcePermanentId: id,
        sourceInstanceId: candidate.partitionSourceInstanceId,
        activationIdentity: "keyword-partition",
        description: "＜Partition＞: you may play the specified digivolution cards without paying their costs.",
        causeAllows: (cause, seat) =>
          cause !== "byBattle" && !(cause === "byEffect" && seat === permanent.controllerSeat),
        appliesTo: (_ctx, leavingId) => leavingId === id && stillAvailable(),
        apply: async (ctx) => {
          if (!stillAvailable() || ctx.presetOptionalAnswer === false) return;
          const selected =
            ctx.presetOptionalAnswer === true ? [candidate.matchedInstanceIds[0]!] : await deps.select(ctx, candidate);
          if (selected.length === 0 || !stillAvailable()) return;
          await deps.play(candidate.partitionSourceInstanceId, candidate.matchedInstanceIds);
        },
      },
    ];
  });
}

/** Shared Partition source capture and replay for qualifying battle-area removals (§16-29). */
export function createPartitionReactions(pc: PrimitivesContext) {
  const { access, continuous, effectSeatStack, engine } = pc;

  function capture(
    permanentIds: readonly string[],
    cause: RemovalCause,
    resolvingSeat = effectSeatStack.at(-1) ?? engine.controllerSeat(),
  ) {
    // Production uses the ordered would-leave consult; retain this fallback for primitive-only hosts.
    if (engine.consultLeavePrevention !== undefined) return [];
    return permanentIds
      .map((permanentId) => {
        if (cause === "byBattle") return undefined;
        const perm = access.permanentById(permanentId);
        if (perm === undefined || perm.topCard === undefined) return undefined;
        if (!continuous.hasKeyword(permanentId, "Partition")) return undefined;
        if (cause === "byEffect" && resolvingSeat === perm.controllerSeat) return undefined;
        return partitionCandidate(perm);
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

  function captureReturns(
    instanceIds: readonly string[],
    resolvingSeat?: Seat,
    destination: "handOrDeck" | "security" = "handOrDeck",
  ) {
    const permanentIds = instanceIds.flatMap((instanceId) => {
      const permanentId = pc.helpers.permanentByTopInstance(instanceId);
      if (
        permanentId === undefined ||
        (destination !== "security" && pc.helpers.isRestricted(permanentId, "beReturned")) ||
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
        {
          sourceCardId: partitionSourceCardId,
          sourceInstanceId: partitionSourceInstanceId,
          selectionContext: "partitionActivation",
          visibleInstanceIds: matchedInstanceIds,
        },
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
