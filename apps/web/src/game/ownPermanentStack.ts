export type OwnPermanentTapDestination = "menu" | "stack";

export function ownPermanentTapDestination({
  canAttack,
  canVortex,
  canPromote,
  canLink = false,
  hasEffects,
}: {
  canAttack: boolean;
  canVortex: boolean;
  canPromote: boolean;
  /** The permanent's top card may be linked to another of the player's Digimon. */
  canLink?: boolean;
  hasEffects: boolean;
}): OwnPermanentTapDestination {
  return canAttack || canVortex || canPromote || canLink || hasEffects ? "menu" : "stack";
}
