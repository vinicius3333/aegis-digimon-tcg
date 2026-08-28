#!/usr/bin/env node
// Merge complete, independently crawled Q&A shard files into qa.json.
import fs from "node:fs";
import path from "node:path";
import { loadCardIds } from "./lib/cards.mjs";
import { QA_PATH, RAW_DIR } from "./lib/paths.mjs";
import { readJson, writeJson, updateManifest } from "./lib/manifest.mjs";

const files = process.argv.slice(2).map((file) => path.resolve(file));
if (files.length === 0) {
  process.stderr.write("usage: node tools/kb/merge-qa.mjs <qa-shard.json>...\n");
  process.exit(1);
}

const merged = readJson(QA_PATH, {}) ?? {};
for (const file of files) {
  const shard = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [cardId, rulings] of Object.entries(shard)) merged[cardId] = rulings;
}

const knownIds = new Set(loadCardIds());
const unknown = Object.keys(merged).filter((cardId) => !knownIds.has(cardId));
if (unknown.length > 0) throw new Error(`unknown card IDs in Q&A shards: ${unknown.join(", ")}`);
const failed = loadCardIds().filter((cardId) => !fs.existsSync(path.join(RAW_DIR, "qa", `${cardId}.html`)));

writeJson(QA_PATH, merged);
updateManifest("qa", {
  url: "https://world.digimoncard.com/rule/?card_no=<card_no>",
  cardsScanned: knownIds.size,
  cardsWithRulings: Object.keys(merged).length,
  lastFetched: Object.keys(merged).length,
  failed,
});
process.stdout.write(
  `qa: merged ${files.length} shards, ${Object.keys(merged).length} cards with rulings, ${failed.length} cards not fetched -> ${QA_PATH}\n`,
);
