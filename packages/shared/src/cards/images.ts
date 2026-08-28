const GITHUB_BASE = "https://raw.githubusercontent.com/TakaOtaku/Digimon-Card-App/main/src/assets/images/cards";

export function cardImageUrls(cardId: string): string[] {
  const id = cardId.replace(/-Errata$/, "");
  return [`${GITHUB_BASE}/${id}.webp`, `${GITHUB_BASE}/${id}-Sample.webp`];
}
