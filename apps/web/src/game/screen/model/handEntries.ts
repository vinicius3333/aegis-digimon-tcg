/* The viewer's hand, twice.

   `handEntries` is the live hand, which is what every legality answer is read off — the
   server's own projections travel on each card. `shownHandEntries` is the hand on screen,
   which a paced snapshot or turn-start draw hold can keep behind the live one. A card the hold still
   shows but the server has already taken has no projections left, so it is filled in as
   unplayable rather than dropped: the viewer sees the card leave when the ribbon says it
   does, and cannot act on it meanwhile. A card an optimistic play has taken out of the
   hand is left out of both. */

import { CardKind, getCardDefinition, type CardInstance, type PlayerState } from "@aegis/shared";
import type { HandEntry } from "../../piece";

export function handEntriesOf({
  viewer,
  shownHand,
  handHeld,
  optimisticPlayedInstanceId,
  sorted = false,
}: {
  viewer: PlayerState;
  sorted?: boolean;
  /** The hand on screen, held by a draw ribbon or the paced presentation revision. */
  shownHand: readonly CardInstance[] | undefined;
  handHeld: boolean;
  optimisticPlayedInstanceId: string | undefined;
}): { handEntries: HandEntry[]; shownHandEntries: HandEntry[] } {
  const handEntries: HandEntry[] = (viewer.hand ?? []).map((ci) => ({
    instanceId: ci.instanceId,
    cardId: ci.cardId,
    artId: ci.artId,
    activatableEffectsJson: ci.activatableEffectsJson,
    playableFromHand: ci.playableFromHand,
    projectedPlayCost: ci.projectedPlayCost,
    digivolveTargetPermanentIds: [...ci.digivolveTargetPermanentIds],
    linkTargetPermanentIds: [...ci.linkTargetPermanentIds],
    digivolveRoutes: [...(ci.digivolveRoutes ?? [])].map((route) => ({
      permanentId: route.permanentId,
      alternateRequirementIndex: route.alternateRequirementIndex,
      projectedCost: route.projectedCost,
    })),
    dnaDigivolveRoutes: [...(ci.dnaDigivolveRoutes ?? [])].map((route) => ({
      materialPermanentIds: JSON.parse(route.materialPermanentIdsJson) as string[],
      projectedCost: route.projectedCost,
    })),
    appFusionRoutes: [...(ci.appFusionRoutes ?? [])].map((route) => ({
      hostPermanentId: route.hostPermanentId,
      linkedInstanceId: route.linkedInstanceId,
      projectedCost: route.projectedCost,
    })),
  }));
  const shownHandEntries: HandEntry[] = (
    !handHeld
      ? [...handEntries]
      : [...(shownHand ?? [])].map(
          (ci) =>
            handEntries.find((entry) => entry.instanceId === ci.instanceId) ?? {
              instanceId: ci.instanceId,
              cardId: ci.cardId,
              artId: ci.artId,
              activatableEffectsJson: "",
              playableFromHand: false,
              projectedPlayCost: -1,
              digivolveTargetPermanentIds: [],
              linkTargetPermanentIds: [],
              dnaDigivolveRoutes: [],
              appFusionRoutes: [],
            },
        )
  ).filter((entry) => entry.instanceId !== optimisticPlayedInstanceId);
  // Sort the presentation array before callbacks resolve their indexes. The live
  // hand and the server's legal routes remain keyed by the original instance IDs.
  if (sorted) {
    const rank = (entry: HandEntry): number => {
      const definition = getCardDefinition(entry.cardId);
      if (definition?.kinds.includes(CardKind.Digimon) || definition?.kinds.includes(CardKind.DigiEgg))
        return definition.level ?? 0;
      return definition?.kinds.includes(CardKind.Tamer) ? 100 : 200;
    };
    shownHandEntries.sort((a, b) => rank(a) - rank(b));
  }
  return { handEntries, shownHandEntries };
}
