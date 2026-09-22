import type { EffectContext } from "../../EffectContext.js";
import { materialMatchesAssemblySlot, materialsSatisfyAssemblyRecipe } from "../../../actions/assembly.js";
import { type LooseCandidate, looseCardsInZone } from "../targeting/loose.js";
import { assemblyRequirementFor, type Permanent } from "@aegis/shared";

export interface EffectPlayAssemblyPreparation {
  assemblyMaterialInstanceIdsByPlay: Record<string, string[]>;
  assemblyReductionByPlay: Record<string, number>;
}

export interface AvailableEffectPlayAssembly {
  reduction: number;
  materialInstanceIds: string[];
}

/** Return a complete printed Assembly recipe currently available in trash. */
export function availableEffectPlayAssembly(
  ctx: EffectContext,
  playedCard: LooseCandidate,
  reservedMaterialInstanceIds: readonly string[] = [],
): AvailableEffectPlayAssembly | undefined {
  const requirement = assemblyRequirementFor(playedCard.cardId)?.[0];
  if (requirement === undefined) return undefined;
  const materials = requirement.materials;
  const reduction = requirement.reduceCost;

  const playedDefinition = ctx.game.definitionOf({ cardId: playedCard.cardId } as never);
  const reserved = new Set([playedCard.instanceId, ...reservedMaterialInstanceIds]);
  const candidates = looseCardsInZone(ctx, playedCard.ownerSeat, "trash").filter((candidate) => {
    if (reserved.has(candidate.instanceId)) return false;
    const definition = ctx.game.definitionOf({ cardId: candidate.cardId } as never);
    return materials.some((slot) => materialMatchesAssemblySlot(definition, slot, playedDefinition));
  });
  const requiredCount = materials.reduce((sum, slot) => sum + slot.count, 0);
  if (requiredCount === 0 || candidates.length < requiredCount) return undefined;

  // Recipe existence is bipartite matching (expanded material slots ↔ trash cards), not
  // subset enumeration. This stays polynomial even for the eight-material recipes.
  const slots = materials.flatMap((slot) => Array.from({ length: slot.count }, () => slot));
  const candidateDefinitions = candidates.map((candidate) =>
    ctx.game.definitionOf({ cardId: candidate.cardId } as never),
  );
  slots.sort(
    (left, right) =>
      candidateDefinitions.filter((definition) => materialMatchesAssemblySlot(definition, left, playedDefinition))
        .length -
      candidateDefinitions.filter((definition) => materialMatchesAssemblySlot(definition, right, playedDefinition))
        .length,
  );
  const slotForCandidate = new Map<number, number>();
  function assign(slotIndex: number, visitedCandidates: Set<number>): boolean {
    for (let candidateIndex = 0; candidateIndex < candidateDefinitions.length; candidateIndex += 1) {
      if (visitedCandidates.has(candidateIndex)) continue;
      const definition = candidateDefinitions[candidateIndex]!;
      if (!materialMatchesAssemblySlot(definition, slots[slotIndex]!, playedDefinition)) continue;
      visitedCandidates.add(candidateIndex);
      const previousSlot = slotForCandidate.get(candidateIndex);
      if (previousSlot === undefined || assign(previousSlot, visitedCandidates)) {
        slotForCandidate.set(candidateIndex, slotIndex);
        return true;
      }
    }
    return false;
  }

  if (!slots.every((_slot, slotIndex) => assign(slotIndex, new Set()))) return undefined;
  return {
    reduction,
    materialInstanceIds: [...slotForCandidate.keys()].map((candidateIndex) => candidates[candidateIndex]!.instanceId),
  };
}

/** Return only the reduction for single-card affordability checks. */
export function availableEffectPlayAssemblyReduction(
  ctx: EffectContext,
  playedCard: LooseCandidate,
  reservedMaterialInstanceIds: readonly string[] = [],
): number {
  return availableEffectPlayAssembly(ctx, playedCard, reservedMaterialInstanceIds)?.reduction ?? 0;
}

/**
 * Prepare every optional Assembly declaration in one effect-play batch.
 *
 * Selection belongs in the interpreter because it owns the seat-scoped decision API. The play
 * primitive receives only validated assignments and performs the atomic material placement before
 * opening each played Digimon's On Play window.
 */
export async function prepareEffectPlayAssembly(
  ctx: EffectContext,
  playedCards: readonly LooseCandidate[],
  reservedMaterialInstanceIds: readonly string[] = [],
): Promise<EffectPlayAssemblyPreparation> {
  const assemblyMaterialInstanceIdsByPlay: Record<string, string[]> = {};
  const assemblyReductionByPlay: Record<string, number> = {};
  const playedInstanceIds = new Set(playedCards.map(({ instanceId }) => instanceId));
  const reservedMaterialIds = new Set(reservedMaterialInstanceIds);

  for (const playedCard of playedCards) {
    const requirement = assemblyRequirementFor(playedCard.cardId)?.[0];
    if (requirement === undefined) continue;
    const playedDefinition = ctx.game.definitionOf({ cardId: playedCard.cardId } as never);

    const requiredCount = requirement.materials.reduce((sum, slot) => sum + slot.count, 0);
    const materialCandidates = looseCardsInZone(ctx, playedCard.ownerSeat, "trash").filter((candidate) => {
      if (playedInstanceIds.has(candidate.instanceId) || reservedMaterialIds.has(candidate.instanceId)) return false;
      const definition = ctx.game.definitionOf({ cardId: candidate.cardId } as never);
      return requirement.materials.some((slot) => materialMatchesAssemblySlot(definition, slot, playedDefinition));
    });
    if (requiredCount === 0 || materialCandidates.length < requiredCount) continue;

    const selected = await ctx.ask.selectCards(ctx, {
      candidates: materialCandidates.map(({ instanceId }) => instanceId),
      min: 0,
      max: requiredCount,
      assemblyCardId: playedCard.cardId,
    });
    const selectedDefinitions = selected
      .map((instanceId) => materialCandidates.find((candidate) => candidate.instanceId === instanceId))
      .filter((candidate): candidate is LooseCandidate => candidate !== undefined)
      .map((candidate) => ctx.game.definitionOf({ cardId: candidate.cardId } as never));
    if (!materialsSatisfyAssemblyRecipe(selectedDefinitions, requirement.materials, playedDefinition)) continue;

    assemblyMaterialInstanceIdsByPlay[playedCard.instanceId] = selected;
    assemblyReductionByPlay[playedCard.instanceId] = requirement.reduceCost;
    for (const instanceId of selected) reservedMaterialIds.add(instanceId);
  }

  return { assemblyMaterialInstanceIdsByPlay, assemblyReductionByPlay };
}

type EffectPlayOptions = Parameters<EffectContext["fx"]["playInstances"]>[1];

/** Play selected loose cards through the one effect-play seam that always prepares Assembly. */
export async function playEffectInstances(
  ctx: EffectContext,
  playedCards: readonly LooseCandidate[],
  options: EffectPlayOptions = {},
): Promise<Permanent[]> {
  const reservedDigiXrosMaterials = [
    ...(options?.digiXrosMaterialInstanceIds ?? []),
    ...Object.values(options?.digiXrosMaterialInstanceIdsByPlay ?? {}).flat(),
  ];
  const { assemblyMaterialInstanceIdsByPlay, assemblyReductionByPlay } = await prepareEffectPlayAssembly(
    ctx,
    playedCards,
    reservedDigiXrosMaterials,
  );
  const hasAssembly = Object.keys(assemblyMaterialInstanceIdsByPlay).length > 0;
  const instanceIds = playedCards.map(({ instanceId }) => instanceId);

  return ctx.fx.playInstances(instanceIds, {
    ...options,
    ...(hasAssembly
      ? {
          assemblyMaterialInstanceIdsByPlay: {
            ...(options?.assemblyMaterialInstanceIdsByPlay ?? {}),
            ...assemblyMaterialInstanceIdsByPlay,
          },
          costDeltaByPlay: Object.fromEntries(
            instanceIds.map((instanceId) => [
              instanceId,
              (options?.costDeltaByPlay?.[instanceId] ?? options?.costDelta ?? 0) +
                (assemblyReductionByPlay[instanceId] ?? 0),
            ]),
          ),
        }
      : {}),
  });
}
