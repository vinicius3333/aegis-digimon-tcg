import { resolveCardArt } from "./arts.js";

const GITHUB_BASE = "https://raw.githubusercontent.com/TakaOtaku/Digimon-Card-App/main/src/assets/images/cards";
const LOCAL_PREVIEW_IDS = new Set([
  ...Array.from({ length: 6 }, (_, index) => `P-${245 + index}`),
]);

/**
 * An errata printing's own image plus the pre-errata one, so a card whose errata art is
 * absent upstream still renders (and vice versa, since some sets ship only the errata art).
 */
function imageCandidates(imageId: string): string[] {
  const preErrata = imageId.replace(/-Errata$/, "");
  return preErrata === imageId ? [imageId] : [imageId, preErrata];
}

/** No urls for a card whose identity is view-gated away (undefined cardId on the client). */
export function cardImageUrls(cardId: string | undefined, artId?: string): string[] {
  if (!cardId) return [];
  const selected = imageCandidates(resolveCardArt(cardId, artId).imageId);
  const base = imageCandidates(resolveCardArt(cardId).imageId);
  const ids = [...new Set([...selected, ...base])];
  return ids.flatMap((id) => {
    const local = LOCAL_PREVIEW_IDS.has(id) ? `/cards/preview/${id}.webp` : undefined;
    return [...(local ? [local] : []), `${GITHUB_BASE}/${id}.webp`, `${GITHUB_BASE}/${id}-Sample.webp`];
  });
}
