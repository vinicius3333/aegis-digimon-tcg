/* What the memory gauge previews, named for the action the player is about to take.

   The gauge traces where memory would land BEFORE the intent is sent. That trace is
   only honest when it prices the action the board would actually perform on release:
   a play costs the card's play cost, a digivolution costs the chosen digivolution
   path, and an interaction that sends no memory-spending intent at all — hatching,
   a drop the board would refuse, a card the server has not made playable — prices
   nothing and draws nothing.

   This module is the pure half. It owns no rules: every cost handed to it is either
   the server's own projection (`CardInstance.projectedPlayCost`) or a client-side
   pricing of a route the server already declared legal
   (`boardModel.getDigivolveCostOptions` over `digivolveTargetPermanentIds`). */

/** Which action the preview is pricing. */
export type MemoryActionKind = "play" | "digivolve";

/** The action the gauge is pricing, and what it would cost. */
export interface MemoryCostCandidate {
  kind: MemoryActionKind;
  cost: number;
}

/** A digivolution route the drop would take. An absent `cost` means the route is unpriced. */
export interface MemoryDigivolveRoute {
  /**
   * The cheapest priced path onto this base, or undefined when the route carries no
   * price the client can know — a DNA digivolution, whose cost depends on materials
   * nobody has chosen yet.
   */
  cost?: number;
}

/** The area the drag is over, in the terms the drop handler answers in. */
export type MemoryDropTarget =
  /** The battle area: the drop plays the card. */
  | { kind: "field" }
  /** One of the viewer's permanents: a digivolution when a route was offered, otherwise a play. */
  | { kind: "permanent"; digivolve?: MemoryDigivolveRoute }
  /** The breeding area: it takes a digivolution or nothing. Hatching starts no drag. */
  | { kind: "breeding"; digivolve?: MemoryDigivolveRoute }
  /** An area that would refuse this drag; releasing spends nothing. */
  | { kind: "refused" };

export interface MemoryCostPreviewQuery {
  /**
   * The hand card the pointer is committing to — hovered, selected or in the air.
   * Absent when no card is, which is also when the gauge previews nothing.
   */
  heldCard?: {
    /** The server's `playableFromHand` projection: whether playing it is legal right now. */
    playable: boolean;
    /** The server's `projectedPlayCost`, or undefined when it projected none. */
    playCost?: number;
  };
  /**
   * Where a started drag currently hovers. Absent while the card is only hovered or
   * selected in hand, where the only action on offer is playing it.
   */
  dropTarget?: MemoryDropTarget;
}

/**
 * The action the gauge should price, or undefined when the pointer offers none.
 *
 * A play is previewed only for a card the server made playable; a digivolution is
 * previewed only for a route the server offered and the client can price. Everything
 * else — a refused drop, an unpriced route, the breeding area with no route onto it —
 * previews nothing rather than guessing.
 */
export function memoryCostPreview(query: MemoryCostPreviewQuery): MemoryCostCandidate | undefined {
  const { heldCard, dropTarget } = query;
  if (!heldCard) return undefined;

  const play = (): MemoryCostCandidate | undefined =>
    heldCard.playable && heldCard.playCost !== undefined && heldCard.playCost >= 0
      ? { kind: "play", cost: heldCard.playCost }
      : undefined;

  if (!dropTarget) return play();

  switch (dropTarget.kind) {
    case "refused":
      return undefined;
    case "field":
      return play();
    case "permanent":
      // No route means the drop falls through to playing the card onto the field.
      if (!dropTarget.digivolve) return play();
      return digivolve(dropTarget.digivolve);
    case "breeding":
      // The breeding area accepts a digivolution or nothing: hatching is a tap on an
      // empty area, costs no memory, and never reaches this module.
      return dropTarget.digivolve ? digivolve(dropTarget.digivolve) : undefined;
  }
}

function digivolve(route: MemoryDigivolveRoute): MemoryCostCandidate | undefined {
  return route.cost !== undefined && route.cost >= 0 ? { kind: "digivolve", cost: route.cost } : undefined;
}
