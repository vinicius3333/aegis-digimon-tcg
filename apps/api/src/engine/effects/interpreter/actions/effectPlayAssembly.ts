import type { EffectContext } from "../../EffectContext.js";
import { materialMatchesAssemblySlot, materialsSatisfyAssemblyRecipe } from "../../../actions/assembly.js";
import { type LooseCandidate, looseCardsInZone } from "../targeting/loose.js";
import { assemblyRequirementFor } from "@aegis/shared";

export interface EffectPlayAssemblyPreparation {
  assemblyMaterialInstanceIdsByPlay: Record<string, string[]>;
  assemblyReductionByPlay: Record<string, number>;
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
): Promise<EffectPlayAssemblyPreparation> {
  const assemblyMaterialInstanceIdsByPlay: Record<string, string[]> = {};
  const assemblyReductionByPlay: Record<string, number> = {};
  const playedInstanceIds = new Set(playedCards.map(({ instanceId }) => instanceId));
  const reservedMaterialIds = new Set<string>();

  for (const playedCard of playedCards) {
    const playedDefinition = ctx.game.definitionOf({ cardId: playedCard.cardId } as never);
    const requirement = assemblyRequirementFor(playedCard.cardId)?.[0];
    if (requirement === undefined) continue;

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
