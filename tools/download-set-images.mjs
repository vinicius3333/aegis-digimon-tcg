import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_FAMOUS_DECKS } from "../packages/shared/dist/decks/index.js";

const WIKIMON_API = "https://wikimon.net/api.php";
const THUMBNAIL_WIDTH = 96;
const OUTPUT_DIRECTORY = fileURLToPath(new URL("../apps/web/public/sets/", import.meta.url));
const TEMPORARY_DIRECTORY = mkdtempSync(join(tmpdir(), "aegis-set-images-"));

/** Wikimon files pad the number ("BT1" → "BT-01") and use either extension. */
function candidateFileNames(collection) {
  const [, prefix, number] = /^([A-Z]+)(\d+)$/.exec(collection) ?? [];
  if (!prefix) throw new Error(`Unrecognized collection code: ${collection}`);
  const padded = `${prefix}-${number.padStart(2, "0")}`;
  return [`File:${padded}.jpg`, `File:${padded}.png`];
}

async function thumbnailUrls(collections) {
  const titles = collections.flatMap(candidateFileNames);
  const query = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: String(THUMBNAIL_WIDTH),
    titles: titles.join("|"),
  });
  const response = await fetch(`${WIKIMON_API}?${query}`);
  if (!response.ok) throw new Error(`Could not query Wikimon: ${response.status}`);
  const pages = Object.values((await response.json()).query.pages);
  return new Map(pages.filter((page) => page.imageinfo).map((page) => [page.title, page.imageinfo[0].thumburl]));
}

try {
  /* Every block in the deck data, not only the blocks the current card-pool
     cutoff exposes, so raising the cutoff never leaves a group without art. */
  const collections = [...new Set(ALL_FAMOUS_DECKS.map((deck) => deck.block))].sort();
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  for (let start = 0; start < collections.length; start += 20) {
    const batch = collections.slice(start, start + 20);
    const urls = await thumbnailUrls(batch);

    for (const collection of batch) {
      const title = candidateFileNames(collection).find((name) => urls.has(name));
      if (!title) throw new Error(`No Wikimon product image for ${collection}`);

      const sourceUrl = urls.get(title);
      const sourceResponse = await fetch(sourceUrl);
      if (!sourceResponse.ok) throw new Error(`Could not download ${sourceUrl}: ${sourceResponse.status}`);

      const sourceFile = join(TEMPORARY_DIRECTORY, title.replace("File:", ""));
      writeFileSync(sourceFile, Buffer.from(await sourceResponse.arrayBuffer()));
      execFileSync(
        "/usr/bin/sips",
        [
          "-s",
          "format",
          "jpeg",
          "-s",
          "formatOptions",
          "70",
          sourceFile,
          "--out",
          join(OUTPUT_DIRECTORY, `${collection}.jpg`),
        ],
        { stdio: "ignore" },
      );
    }
  }

  process.stdout.write(`Downloaded ${collections.length} set images.\n`);
} finally {
  rmSync(TEMPORARY_DIRECTORY, { recursive: true, force: true });
}
