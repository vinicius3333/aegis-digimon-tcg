import { createHash } from "node:crypto";
import { ALL_FAMOUS_DECKS } from "@aegis/shared";
import { assertLegalDeck } from "../../engine/testDecks.js";

export const PILOT_DECK_VERSIONS = [
  "bt26-dgo-2026-09-05-1-glowing-dawn@1",
  "bt26-dgo-2026-09-05-2-abbadomon@1",
  "bt26-dgo-2026-08-28-7-chronomon@1",
] as const;

/** All current BT26 and EX13 catalog recipes, pinned without deleting unsupported archetypes. */
export const TRAINING_DECK_VERSIONS = [
  ...PILOT_DECK_VERSIONS,
  "bt26-dgo-2026-08-28-1-toho-braves@1",
  "bt26-dgo-2026-08-28-4-beelstarmon@1",
  "bt26-dgo-2026-08-28-8-plutomon@1",
  "bt26-dgo-2026-08-28-11-dantemon@1",
  "bt26-dgo-2026-08-28-13-jupitermon@1",
  "bt26-chronomon-bandai@1",
  "bt26-plutomon-bandai@1",
  "bt26-dantemon-bandai@1",
  "ex13-adventure-bandai@1",
  "ex13-imperialdramon-bandai@1",
  "ex13-mamemon-bandai@1",
  "ex13-omnimon-royal-knights@1",
  "ex13-alphamon-royal-knights@1",
  "ex13-ulforceveedramon-royal-knights@1",
  "ex13-magnamon-royal-knights@1",
  "ex13-lordknightmon-royal-knights@1",
  "ex13-gallantmon-royal-knights@1",
  "ex13-dynasmon-royal-knights@1",
  "ex13-craniamon-royal-knights@1",
  "ex13-kentaurosmon-royal-knights@1",
  "ex13-leopardmon-royal-knights@1",
  "ex13-examon-royal-knights@1",
  "ex13-gankoomon-jesmon-royal-knights@1",
] as const;

export function trainingDeck(version: string) {
  if (!TRAINING_DECK_VERSIONS.some((allowed) => allowed === version))
    throw new Error(`Deck is outside the BT26/EX13 training scope: ${version}`);
  const source = ALL_FAMOUS_DECKS.find((deck) => deck.deckVersion === version);
  if (source === undefined) throw new Error(`Missing pinned training deck ${version}`);
  const deck = { mainDeck: [...source.decklist.mainDeck], eggDeck: [...source.decklist.eggDeck] };
  assertLegalDeck(deck);
  const sha256 = createHash("sha256").update(JSON.stringify(deck)).digest("hex");
  return { version, name: source.name, sha256, deck };
}

/** Each 2N-game block covers every learner deck and seat; offsets cover every ordered pairing. */
export function scheduledEpisode(index: number): { versions: [string, string]; learnerSeat: 0 | 1 } {
  const count = TRAINING_DECK_VERSIONS.length;
  const learner = index % count;
  const opponent = (learner + Math.floor(index / (2 * count))) % count;
  const learnerSeat = (Math.floor(index / count) % 2) as 0 | 1;
  return {
    versions:
      learnerSeat === 0
        ? [TRAINING_DECK_VERSIONS[learner]!, TRAINING_DECK_VERSIONS[opponent]!]
        : [TRAINING_DECK_VERSIONS[opponent]!, TRAINING_DECK_VERSIONS[learner]!],
    learnerSeat,
  };
}
