#!/usr/bin/env node
/** Refresh artwork metadata without replacing card rules: --source <DigimonCards.json>. */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sourceCardArts } from "./lib/card-arts.mjs";
const sourceIndex = process.argv.indexOf("--source");
if (sourceIndex < 0 || !process.argv[sourceIndex + 1]) throw new Error("--source <DigimonCards.json> required");
const cards = JSON.parse(readFileSync(new URL("../packages/shared/src/cards/data/cards.json", import.meta.url), "utf8"));
const source = JSON.parse(readFileSync(process.argv[sourceIndex + 1], "utf8"));
const canonical = new Set(cards.map((card) => card.cardId));
const entries = source.filter((card) => canonical.has(card.cardNumber)).map((card) => [card.cardNumber, sourceCardArts(card)]).filter(([, arts]) => arts.length).sort(([a], [b]) => a.localeCompare(b, "en"));
writeFileSync(fileURLToPath(new URL("../packages/shared/src/cards/data/arts.json", import.meta.url)), JSON.stringify(Object.fromEntries(entries), null, 2) + "\n");
console.log(`Imported ${entries.reduce((sum, [, arts]) => sum + arts.length, 0)} alternate arts for ${entries.length} canonical cards`);
