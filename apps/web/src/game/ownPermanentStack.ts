export type OwnPermanentTapDestination = "menu" | "stack";

export function ownPermanentTapDestination({
  canAttack,
  canVortex,
  canPromote,
  hasEffects,
}: {
  canAttack: boolean;
  canVortex: boolean;
  canPromote: boolean;
  hasEffects: boolean;
}): OwnPermanentTapDestination {
  return canAttack || canVortex || canPromote || hasEffects ? "menu" : "stack";
}
