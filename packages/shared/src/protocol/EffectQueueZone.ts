export const EffectQueueZone = {
  BATTLE_AREA: { name: "BATTLE_AREA", value: "battleArea", label: "effectOrder.zone.battleArea", hasBoardBadge: true },
  BREEDING: { name: "BREEDING", value: "breeding", label: "effectOrder.zone.breeding", hasBoardBadge: true },
  TRASH: { name: "TRASH", value: "trash", label: "effectOrder.zone.trash", hasBoardBadge: false },
  SECURITY: { name: "SECURITY", value: "security", label: "effectOrder.zone.security", hasBoardBadge: false },
  HAND: { name: "HAND", value: "hand", label: "effectOrder.zone.hand", hasBoardBadge: false },
  HIDDEN: { name: "HIDDEN", value: "hidden", label: "effectOrder.zone.hidden", hasBoardBadge: false },
} as const;

export type EffectQueueZone = (typeof EffectQueueZone)[keyof typeof EffectQueueZone]["value"];
