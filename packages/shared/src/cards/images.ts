import { resolveCardArt } from "./arts.js";
import { TOKEN_ID_PREFIX } from "./tokens.js";

const GITHUB_BASE = "https://raw.githubusercontent.com/TakaOtaku/Digimon-Card-App/main/src/assets/images/cards";

/**
 * Printings the upstream set has no English image for, bundled as official "SAMPLE" scans.
 * They load after the upstream image, so a published upstream image takes over on its own.
 */
const UNPUBLISHED_IMAGE_IDS = new Set([
  "BT11-023_P1",
  "BT17-059_P1",
  "BT20-014_P1",
  "BT21-005_P1",
  "BT21-009_P2",
  "BT21-018_P2",
  "BT21-023_P2",
  "BT22-004_P1",
  "BT22-063_P2",
  "BT22-099_P1",
  "BT24-011_P2",
  "BT24-059_P2",
  "BT25-041_P2",
  "BT25-053_P2",
  "BT5-090_P2",
  "EX8-055_P2",
  "LM-063",
  "LM-064",
  "LM-065",
  "LM-066",
  "LM-067",
  "LM-068",
  "P-147",
  "ST24-11_P2",
  "ST24-11_P3",
]);

/**
 * An errata printing's own image plus the pre-errata one, so a card whose errata art is
 * absent upstream still renders (and vice versa, since some sets ship only the errata art).
 */
function imageCandidates(imageId: string): string[] {
  const preErrata = imageId.replace(/-Errata$/, "");
  return preErrata === imageId ? [imageId] : [imageId, preErrata];
}

/**
 * Tokens are not in the upstream card image set, so their official art is bundled with the
 * client. The file name is the card id folded to ASCII, since a url is a poor place for the
 * accents and ampersands a token name can carry.
 */
function tokenImageUrl(cardId: string): string {
  const slug = cardId
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9-]/g, "-")
    .replace(/-+/g, "-");
  return `/cards/tokens/${slug}.webp`;
}

/** No urls for a card whose identity is view-gated away (undefined cardId on the client). */
export function cardImageUrls(cardId: string | undefined, artId?: string): string[] {
  if (!cardId) return [];
  if (cardId.startsWith(TOKEN_ID_PREFIX)) return [tokenImageUrl(cardId)];
  const selected = imageCandidates(resolveCardArt(cardId, artId).imageId);
  const base = imageCandidates(resolveCardArt(cardId).imageId);
  const ids = [...new Set([...selected, ...base])];
  return ids.flatMap((id) => {
    const unpublished = UNPUBLISHED_IMAGE_IDS.has(id) ? `/cards/unpublished/${id}.webp` : undefined;
    return [
      `${GITHUB_BASE}/${id}.webp`,
      ...(unpublished ? [unpublished] : []),
      `${GITHUB_BASE}/${id}-Sample.webp`,
    ];
  });
}
