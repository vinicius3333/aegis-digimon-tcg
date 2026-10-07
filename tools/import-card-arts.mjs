#!/usr/bin/env node
/** Refresh artwork metadata without replacing card rules: --source <DigimonCards.json>. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CARD_IMAGE_ORIGINS } from "./deploy/card-images.mjs";
import { sourceCardArts, sourceJapaneseArts } from "./lib/card-arts.mjs";
const sourceIndex = process.argv.indexOf("--source");
if (sourceIndex < 0 || !process.argv[sourceIndex + 1]) throw new Error("--source <DigimonCards.json> required");
const cards = JSON.parse(
  readFileSync(new URL("../packages/shared/src/cards/data/cards.json", import.meta.url), "utf8"),
);
const source = JSON.parse(readFileSync(process.argv[sourceIndex + 1], "utf8"));
const canonical = new Set(cards.map((card) => card.cardId));

async function isHosted(imageId) {
  for (const origin of CARD_IMAGE_ORIGINS) {
    for (const name of [`${imageId}.webp`, `${imageId}-Sample.webp`]) {
      try {
        const response = await fetch(`${origin}/${name}`, { method: "HEAD", signal: AbortSignal.timeout(30_000) });
        if (response.ok) return true;
      } catch {
        // Try the next candidate; an unreachable origin is the same as a missing image.
      }
    }
  }
  return false;
}

/**
 * The source lists Japanese printings whose image was never uploaded. Without this check the
 * picker would offer a "Japanese" art that silently renders the English fallback.
 */
async function hostedImageIds(imageIds, concurrency = 16) {
  const queue = [...imageIds];
  const hosted = new Set();
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length) {
        const imageId = queue.shift();
        if (await isHosted(imageId)) hosted.add(imageId);
      }
    }),
  );
  return hosted;
}

const sourceCards = source.filter((card) => canonical.has(card.cardNumber));
const japaneseArts = new Map(sourceCards.map((card) => [card.cardNumber, sourceJapaneseArts(card)]));
const hosted = await hostedImageIds([...japaneseArts.values()].flat().map((art) => art.imageId));
const entries = sourceCards
  .map((card) => [
    card.cardNumber,
    [...sourceCardArts(card), ...japaneseArts.get(card.cardNumber).filter((art) => hosted.has(art.imageId))],
  ])
  .filter(([, arts]) => arts.length)
  .sort(([a], [b]) => a.localeCompare(b, "en"));
writeFileSync(
  fileURLToPath(new URL("../packages/shared/src/cards/data/arts.json", import.meta.url)),
  JSON.stringify(Object.fromEntries(entries), null, 2) + "\n",
);
console.log(
  `Imported ${entries.reduce((sum, [, arts]) => sum + arts.length, 0)} alternate arts for ${entries.length} canonical cards`,
);
