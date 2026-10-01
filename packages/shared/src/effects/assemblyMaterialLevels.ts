/**
 * Levels a trash card may count as when it fills an Assembly slot. EX9-062 SkullGreymon prints
 * "This card is also treated as level 4 for [Kimeramon]'s assembly": an extra permission for that
 * recipe only, so its catalog level stays 5 everywhere else.
 */
export function assemblyMaterialLevels(
  material: { cardId: string; level?: number },
  destination?: { nameEn: string },
): (number | undefined)[] {
  if (material.cardId === "EX9-062" && destination?.nameEn === "Kimeramon") return [material.level, 4];
  return [material.level];
}
