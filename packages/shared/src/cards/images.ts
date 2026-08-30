const GITHUB_BASE = "https://raw.githubusercontent.com/TakaOtaku/Digimon-Card-App/main/src/assets/images/cards";

/** No urls for a card whose identity is view-gated away (undefined cardId on the client). */
export function cardImageUrls(cardId: string | undefined): string[] {
  if (!cardId) return [];
  const id = cardId.replace(/-Errata$/, "");
  return [`${GITHUB_BASE}/${id}.webp`, `${GITHUB_BASE}/${id}-Sample.webp`];
}
