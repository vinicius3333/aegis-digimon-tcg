// Mirrors the card images the client requests into the gateway's shared assets directory,
// so production serves them from /assets/card-images instead of a third-party host.
// It only adds missing files: an image already present is never re-downloaded or replaced.
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const CARD_IMAGE_ORIGINS = [
  "https://web-garage.takaotaku.de",
  // The last upstream commit that still tracked the images in Git, for anything the bucket lacks.
  "https://raw.githubusercontent.com/TakaOtaku/Digimon-Card-App/9f666f16501fb329b4e2fd9851e862afe2d7da05/src/assets/images/cards",
];

const TOKEN_ID_PREFIX = "TOKEN-";

/** Every image id `cardImageUrls` in @aegis/shared can request, read from the committed card data. */
export function cardImageIds(source) {
  const data = `${source}/packages/shared/src/cards/data`;
  const cards = JSON.parse(readFileSync(`${data}/cards.json`, "utf8"));
  const arts = JSON.parse(readFileSync(`${data}/arts.json`, "utf8"));
  const ids = new Set();
  const add = (imageId) => {
    ids.add(imageId);
    ids.add(imageId.replace(/-Errata$/, ""));
  };
  for (const card of cards) {
    if (!card.cardId.startsWith(TOKEN_ID_PREFIX)) add(card.imageId ?? card.cardId);
  }
  for (const printings of Object.values(arts)) {
    for (const art of printings) add(art.imageId);
  }
  return [...ids].sort();
}

function isWebp(bytes) {
  return (
    bytes.length > 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  );
}

async function download(fetch, name) {
  for (const origin of CARD_IMAGE_ORIGINS) {
    try {
      const response = await fetch(`${origin}/${name}`, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      if (isWebp(bytes)) return bytes;
    } catch {
      // Try the next origin; a missing image is retried on the next sync.
    }
  }
  return undefined;
}

/**
 * Downloads `<id>.webp` for each id, or `<id>-Sample.webp` when only the sample scan exists.
 * A sample never blocks the real image: the next sync still looks for `<id>.webp`.
 */
export async function syncCardImages({ source, destination, fetch = globalThis.fetch, concurrency = 16 }) {
  const ids = cardImageIds(source);
  mkdirSync(destination, { recursive: true, mode: 0o755 });
  const result = { present: 0, downloaded: 0, missing: [] };
  const write = (name, bytes) => {
    const temporary = `${destination}/.${name}.partial`;
    writeFileSync(temporary, bytes, { mode: 0o644 });
    renameSync(temporary, `${destination}/${name}`);
  };
  const syncOne = async (id) => {
    if (existsSync(`${destination}/${id}.webp`)) {
      result.present += 1;
      return;
    }
    const image = await download(fetch, `${id}.webp`);
    if (image) {
      write(`${id}.webp`, image);
      rmSync(`${destination}/${id}-Sample.webp`, { force: true });
      result.downloaded += 1;
      return;
    }
    if (existsSync(`${destination}/${id}-Sample.webp`)) {
      result.present += 1;
      return;
    }
    const sample = await download(fetch, `${id}-Sample.webp`);
    if (sample) {
      write(`${id}-Sample.webp`, sample);
      result.downloaded += 1;
      return;
    }
    result.missing.push(id);
  };
  const queue = [...ids];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length) await syncOne(queue.shift());
    }),
  );
  result.missing.sort();
  return result;
}

export function describeSync({ present, downloaded, missing }) {
  const preview = missing.slice(0, 20).join(" ");
  return `card images: ${downloaded} downloaded, ${present} present, ${missing.length} missing${missing.length ? ` (${preview}${missing.length > 20 ? " ..." : ""})` : ""}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const index = args.indexOf(`--${name}`);
    return index < 0 ? fallback : args[index + 1];
  };
  const state = resolve(option("state", "/opt/aegis-rollout"));
  syncCardImages({ source: resolve(option("source", "/source")), destination: `${state}/assets/card-images` })
    .then((result) => console.log(`[aegis/card-images] ${describeSync(result)}`))
    .catch((error) => {
      console.error(`[aegis/card-images] ${error.message}`);
      process.exitCode = 1;
    });
}
