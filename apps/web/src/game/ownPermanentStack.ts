export type OwnPermanentTapDestination = "menu" | "stack";

export function ownPermanentTapDestination({
  canAttack,
  canVortex,
  canPromote,
}: {
  canAttack: boolean;
  canVortex: boolean;
  canPromote: boolean;
}): OwnPermanentTapDestination {
  return canAttack || canVortex || canPromote ? "menu" : "stack";
}
