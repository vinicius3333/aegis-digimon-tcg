import type { CardSource } from "#api/engine/effects/CardSource";

export function isPubliclyVisibleSource(source: CardSource): boolean {
  return (
    source.isOnBattleArea?.() === true ||
    source.isOnBreedingArea?.() === true ||
    source.isInTrash?.() === true ||
    source.isInSecurity?.() === true
  );
}
