/**
 * Older card records created before `UR` was added to the rarity list retain
 * their old numeric values. Keep the correction explicit: newer real UR cards
 * must never be converted just because their serialized value is also 4.
 */
export const LEGACY_SECRET_RARE_CARD_IDS = new Set([
  "BT1-114", "BT1-115",
  "BT2-111", "BT2-112",
  "BT3-111", "BT3-112",
  "BT4-113", "BT4-114", "BT4-115",
  "BT5-111", "BT5-112",
  "BT6-111", "BT6-112",
  "BT7-111", "BT7-112",
  "BT8-111", "BT8-112",
  "BT9-111", "BT9-112",
  "BT10-111", "BT10-112",
  "EX1-073",
  "EX2-073", "EX2-074",
]);

export function normalizeAssetRarity(cardId, serializedRarity) {
  if (LEGACY_SECRET_RARE_CARD_IDS.has(cardId)) return "SEC";

  const promo = /^P-(\d{3})$/.exec(cardId);
  if (promo !== null && Number(promo[1]) <= 78) return "P";

  return serializedRarity;
}
