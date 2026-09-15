import { readFile, writeFile } from "node:fs/promises";
import { ALL_FAMOUS_DECKS, VALIDATED_FAMOUS_DECKS, isFamousDeckAvailable, type FamousDeck } from "@aegis/shared";
import { assertLegalDeck, type Decklist } from "../engine/testDecks.js";
import { runBattleFuzz, type FuzzDeck } from "./battleFuzzer.js";
import { parseDeckCorpus } from "./deckCorpus.js";

function integerFlag(name: string, fallback: number | undefined): number | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const parsed = Number(process.argv[index + 1]);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} requires a positive integer`);
  return parsed;
}

function stringFlag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

function fuzzDeck(source: FamousDeck): FuzzDeck {
  const deck: Decklist = { mainDeck: [...source.decklist.mainDeck], eggDeck: [...source.decklist.eggDeck] };
  assertLegalDeck(deck);
  return { id: source.deckVersion, deck };
}

async function main(): Promise<void> {
  const exhaustive = process.argv.includes("--exhaustive");
  const useAvailableCatalog = process.argv.includes("--available-catalog");
  const sources = useAvailableCatalog ? ALL_FAMOUS_DECKS.filter(isFamousDeckAvailable) : VALIDATED_FAMOUS_DECKS;
  const unique = new Map<string, FuzzDeck>();
  for (const source of sources) {
    const candidate = fuzzDeck(source);
    const fingerprint = JSON.stringify({
      m: [...candidate.deck.mainDeck].sort(),
      e: [...candidate.deck.eggDeck].sort(),
    });
    if (!unique.has(fingerprint)) unique.set(fingerprint, candidate);
  }
  const deckFile = stringFlag("--deck-file");
  if (deckFile) {
    const saved = parseDeckCorpus(JSON.parse(await readFile(deckFile, "utf8")) as unknown);
    for (const candidate of saved) {
      const fingerprint = JSON.stringify({
        m: [...candidate.deck.mainDeck].sort(),
        e: [...candidate.deck.eggDeck].sort(),
      });
      if (!unique.has(fingerprint)) unique.set(fingerprint, candidate);
    }
  }
  const decks = [...unique.values()];
  const maximumMatchups = exhaustive ? undefined : integerFlag("--matchups", decks.length);
  const started = Date.now();
  const report = await runBattleFuzz({
    decks,
    baseSeed: integerFlag("--seed", 20_260_914),
    seedsPerMatchup: integerFlag("--seeds", 1),
    orderedSeats: !process.argv.includes("--unordered"),
    maximumMatchups,
    turnLimit: integerFlag("--turn-limit", 60),
    maximumPresentationBurst: integerFlag("--maximum-burst", 40),
  });
  const receipt = { ...report, durationMs: Date.now() - started };
  const output = stringFlag("--output");
  if (output) await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(receipt, null, 2));
  if (report.failures.length > 0) process.exitCode = 1;
}

await main();
