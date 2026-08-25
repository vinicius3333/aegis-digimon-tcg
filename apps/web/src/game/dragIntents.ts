/* What a drop would actually send, named for the player who is still holding the
   card. The board outlines every area that would accept the drag and floats the
   name of the intent above the ghost, so a drag reads before it is released.

   This module is the pure half. It owns no rules: every "may I" answer in the
   query below is the server's projection (`playableFromHand`,
   `digivolveTargetPermanentIds`, `attackablePermanentIds`, `canAttackPlayer`),
   read off the same state `GameScreen`'s drop handler reads. The mapping here
   mirrors that handler one branch at a time — a target this module calls
   unreachable is a target the drop would refuse. */

/** The `data-drop` names the board paints on its drop areas. */
export type DropTarget = "battle-you" | "perm-you" | "breeding-you" | "opp-security" | "perm-opp";

/** What the drop would do, in the words the floating label uses. */
export type DragIntent = "play" | "evolve" | "breeding" | "use" | "attack";

/** How a hand card may reach a permanent, as `boardModel.handCardEvolutionRoute` reports it. */
export type EvolutionRouteKind = "normal" | "dna" | "both";

export interface DragIntentQuery {
  drag:
    | {
        kind: "play";
        /** An Option is used, not put onto the field. */
        isOption: boolean;
        /** A Digi-Egg is hatched from the egg deck; dragging it does nothing. */
        isDigiEgg: boolean;
      }
    | { kind: "attack" };
  target: DropTarget;
  /** `perm-you`: how the held card may reach that permanent, per `handCardEvolutionRoute`. */
  evolutionRoute?: EvolutionRouteKind;
  /** `breeding-you`: the server offered the raised Digimon as a base for the held card. */
  digivolvable?: boolean;
  /** `opp-security`: the dragged attacker may declare on the player. */
  canAttackPlayer?: boolean;
  /** `perm-opp`: the dragged attacker may declare on this permanent. */
  attackable?: boolean;
}

/**
 * The intent a drop on this area would send, or null when the area would refuse
 * the drag — which is also what decides whether the area lights up at all.
 */
export function dragIntentFor(query: DragIntentQuery): DragIntent | null {
  const { drag, target } = query;
  if (drag.kind === "attack") {
    if (target === "opp-security") return query.canAttackPlayer ? "attack" : null;
    if (target === "perm-opp") return query.attackable ? "attack" : null;
    return null;
  }
  // Eggs never leave the hand by drag; the breeding area hatches them.
  if (drag.isDigiEgg) return null;
  switch (target) {
    case "perm-you":
      // An Option resolves on its own; dropping it on a Digimon means nothing.
      if (query.evolutionRoute) return "evolve";
      return drag.isOption ? null : "play";
    case "breeding-you":
      return query.digivolvable ? "breeding" : null;
    case "battle-you":
      return drag.isOption ? "use" : "play";
    default:
      return null;
  }
}

const INTENT_LABEL_KEYS = {
  play: "game.dragIntent.play",
  evolve: "game.dragIntent.evolve",
  breeding: "game.dragIntent.breeding",
  use: "game.dragIntent.use",
  attack: "game.dragIntent.attack",
} as const;

/** The translation key the floating label prints for an intent. */
export function dragIntentLabelKey(intent: DragIntent): (typeof INTENT_LABEL_KEYS)[DragIntent] {
  return INTENT_LABEL_KEYS[intent];
}

/**
 * How far above the pointer the label floats. The ghost is centred on the
 * pointer, so the label clears both it and the finger holding it.
 */
export const DRAG_INTENT_LABEL_OFFSET_PX = 108;

/**
 * The same label on a touch screen. A fingertip covers roughly a 40px disc around
 * the contact point and the hand holding it covers everything below, so the mouse
 * offset — which only has to clear the ghost — leaves the label under the knuckle.
 */
export const DRAG_INTENT_LABEL_OFFSET_TOUCH_PX = 156;

/** How far above the pointer the intent label sits for the pointer in use. */
export function dragIntentLabelOffsetPx(coarsePointer: boolean): number {
  return coarsePointer ? DRAG_INTENT_LABEL_OFFSET_TOUCH_PX : DRAG_INTENT_LABEL_OFFSET_PX;
}
