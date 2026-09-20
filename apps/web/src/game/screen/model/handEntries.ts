/* The viewer's hand, twice.

   `handEntries` is the live hand, which is what every legality answer is read off — the
   server's own projections travel on each card. `shownHandEntries` is the hand on screen,
   which only a turn-start draw hold can keep behind the live one. A card the hold still
   shows but the server has already taken has no projections left, so it is filled in as
   unplayable rather than dropped: the viewer sees the card leave when the ribbon says it
   does, and cannot act on it meanwhile. A card an optimistic play has taken out of the
   hand is left out of both. */

import type { CardInstance, PlayerState } from "@aegis/shared";
import type { HandEntry } from "../../piece";

export function handEntriesOf({
  viewer,
  shownHand,
  handHeld,
  optimisticPlayedInstanceId,
}: {
  viewer: PlayerState;
  /** The hand on screen, which a draw hold may keep behind the server's. */
  shownHand: readonly CardInstance[] | undefined;
  handHeld: boolean;
  optimisticPlayedInstanceId: string | undefined;
}): { handEntries: HandEntry[]; shownHandEntries: HandEntry[] } {
  const handEntries: HandEntry[] = viewer.hand.map((ci) => ({
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
      ? handEntries
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
  return { handEntries, shownHandEntries };
}
