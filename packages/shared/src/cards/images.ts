const GITHUB_BASE = "https://raw.githubusercontent.com/TakaOtaku/Digimon-Card-App/main/src/assets/images/cards";
const LOCAL_PREVIEW_IDS = new Set([
  ...Array.from({ length: 71 }, (_, index) => `EX13-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 6 }, (_, index) => `P-${245 + index}`),
]);

/** No urls for a card whose identity is view-gated away (undefined cardId on the client). */
export function cardImageUrls(cardId: string | undefined): string[] {
  if (!cardId) return [];
  const id = cardId.replace(/-Errata$/, "");
  const local = LOCAL_PREVIEW_IDS.has(id) ? `/cards/preview/${id}.webp` : undefined;
  return [...(local ? [local] : []), `${GITHUB_BASE}/${id}.webp`, `${GITHUB_BASE}/${id}-Sample.webp`];
}
