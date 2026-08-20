import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CardKind, getCardDefinition, getCompiledCard, releaseDateForCard } from "@aegis/shared";
import "../../cards/index.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { effectiveCopyLimit } from "../../engine/banlistRestrictions.js";
import { validateDecklist } from "../../engine/deckValidation.js";
import { MAIN_DECK_SIZE, MAX_EGG_DECK_SIZE } from "../../engine/testDecks.js";
import { ALL_META_DECKS, COVERED_BLOCKS, blockReleaseDate, metaDeckByVersion, metaDecksForBlock } from "./index.js";
import { deckFingerprint, type MetaDeck } from "./types.js";

/**
 * The shipped bot decks must stay legal without anyone remembering to re-check
 * them. This suite is the gate: it reads the same authorities the server reads —
 * `cards.json`, the effect registry, `data/kb/banlist.json`, and
 * `validateDecklist` — so a KB refresh or an edited list fails here instead of
 * dealing an illegal deck into a tournament.
 */

const CARDS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "cards");

/**
 * `deckVersion` -> content fingerprint. `deckVersion` is authored, so it can drift
 * from the cards; the fingerprint cannot. Editing a list without bumping its
 * revision fails here, which is the point: a recorded bot result must stay
 * traceable to the exact 55 cards that were played.
 */
const PINNED_FINGERPRINTS: Readonly<Record<string, string>> = {
  "bt1-red-omnimon@1": "c2c34bde9aff7ddc",
  "bt2-red-omnimon@1": "3e1c40f0f86f694d",
  "bt3-omnimon-alter-s@1": "11eaf9597ef9a3c1",
  "bt4-security-control@1": "8b958fa541185b97",
  "bt4-yellow-wargreymon@1": "653ef3824b7dfbb5",
  "bt5-lordknightmon@1": "e3d0594a550cf1d7",
  "bt5-shoutmon-dx@1": "5e392a3d2c3cdc20",
  "bt6-red-jesmon@1": "fcac45d1a0b4b652",
  "bt6-blue-bond-of-friendship@1": "3aa88a3d9c960729",
  "ex1-blue-hybrid@1": "76cc4b644867c119",
  "ex1-lilith-loop@1": "3e4095216bd2ab02",
  "bt7-blue-hybrid@1": "a59e51a65c19f9dd",
  "bt7-red-jesmon@1": "a6fb767e981f4485",
  "bt8-mastemon@1": "d536deb382c1f4c2",
  "bt8-blackwargreymon@1": "774e19b6281a837f",
  "bt9-wargreymon-x@1": "e860ff5f5c7206fe",
  "bt10-xros-heart@1": "6f75566d9f90b845",
  "bt10-blue-flare@1": "60b6806fa5aad2a4",
};

/**
 * Whether a card prints text an effect module would have to implement. Unknown ids
 * throw rather than return false: a filtered run of this file must not silently
 * treat a typo'd id as an effectless card and skip the module check for it.
 *
 * `securityEffectText` is deliberately not consulted. It is a real field on 820 cards,
 * but it is a derived duplicate of the `[Security]` clause inside `effectText`: no card
 * in the whole pool has security text and blank effect/inherited text, so reading it
 * cannot change this answer for any card.
 */
function printsAnEffect(cardId: string): boolean {
  const definition = getCardDefinition(cardId);
  if (definition === undefined) throw new Error(`${cardId} is not in cards.json`);
  return Boolean(definition.effectText?.trim() || definition.inheritedEffectText?.trim());
}

const allCards = (deck: MetaDeck): string[] => [...deck.decklist.mainDeck, ...deck.decklist.eggDeck];

it("ships at least one deck", () => {
  expect(ALL_META_DECKS.length).toBeGreaterThan(0);
});

it("gives every covered block a resolvable release date", () => {
  for (const block of COVERED_BLOCKS) {
    expect(blockReleaseDate(block), `block ${block} names no known product`).toBeDefined();
  }
});

it("keeps deck ids and versions unique", () => {
  const ids = ALL_META_DECKS.map((deck) => deck.deckId);
  const versions = ALL_META_DECKS.map((deck) => deck.deckVersion);
  expect(new Set(ids).size).toBe(ids.length);
  expect(new Set(versions).size).toBe(versions.length);
  for (const deck of ALL_META_DECKS) {
    expect(deck.deckVersion.startsWith(`${deck.deckId}@`)).toBe(true);
    expect(metaDeckByVersion(deck.deckVersion)).toBe(deck);
  }
});

it("pins every deck version to its contents", () => {
  const actual = Object.fromEntries(ALL_META_DECKS.map((deck) => [deck.deckVersion, deckFingerprint(deck.decklist)]));
  expect(actual).toEqual(PINNED_FINGERPRINTS);
});

describe.each(ALL_META_DECKS.map((deck) => [deck.deckVersion, deck] as const))("%s", (_version, deck) => {
  const blockDate = blockReleaseDate(deck.block)!;

  it("passes the server's deck-legality gate", () => {
    expect(validateDecklist(deck.decklist)).toEqual({ ok: true });
  });

  it("has a legal deck shape", () => {
    expect(deck.decklist.mainDeck).toHaveLength(MAIN_DECK_SIZE);
    expect(deck.decklist.eggDeck.length).toBeGreaterThan(0);
    expect(deck.decklist.eggDeck.length).toBeLessThanOrEqual(MAX_EGG_DECK_SIZE);
    for (const cardId of deck.decklist.mainDeck) {
      expect(getCardDefinition(cardId)?.kinds.includes(CardKind.DigiEgg), `${cardId} in main deck`).toBe(false);
    }
    for (const cardId of deck.decklist.eggDeck) {
      expect(getCardDefinition(cardId)?.kinds.includes(CardKind.DigiEgg), `${cardId} in egg deck`).toBe(true);
    }
  });

  it("only uses cards released by its block", () => {
    for (const cardId of allCards(deck)) {
      const definition = getCardDefinition(cardId);
      expect(definition, `${cardId} is not in cards.json`).toBeDefined();
      const releaseDate = releaseDateForCard(definition!);
      expect(releaseDate, `${cardId} has no release date`).toBeDefined();
      expect(releaseDate! <= blockDate, `${cardId} postdates ${deck.block}`).toBe(true);
    }
  });

  const distinctCards = [...new Set(allCards(deck))];

  it("only uses cards whose effects the engine implements", () => {
    for (const cardId of distinctCards.filter(printsAnEffect)) {
      expect(getEffectModule(cardId), `${cardId} has no registered effect module`).toBeDefined();
      const set = getCardDefinition(cardId)!.set;
      expect(existsSync(join(CARDS_DIR, set, `${cardId}.ts`)), `${cardId} has no card module file`).toBe(true);
    }
  });

  // Blank printed text is a data property, not a rules property, so it is not on its own
  // a licence to skip the module check above: cards with blank text elsewhere in the pool
  // do carry hand-written modules. What licences the skip is the compiled IR agreeing
  // there is nothing to run.
  it("has nothing to run for the cards it exempts from the module check", () => {
    for (const cardId of distinctCards.filter((id) => !printsAnEffect(id))) {
      expect(getCompiledCard(cardId)?.effects ?? [], `${cardId} prints no text but compiles to effects`).toHaveLength(
        0,
      );
    }
  });

  it("declares the colors it actually plays", () => {
    const played = new Set(allCards(deck).flatMap((cardId) => getCardDefinition(cardId)!.colors));
    expect(new Set(deck.colors)).toEqual(played);
  });

  it("respects the current banlist", () => {
    const counts = new Map<string, number>();
    for (const cardId of allCards(deck)) counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
    for (const [cardId, count] of counts) {
      const limit = effectiveCopyLimit(cardId);
      expect(limit, `${cardId} is banned`).toBeGreaterThan(0);
      expect(count, `${cardId} exceeds its limit of ${limit}`).toBeLessThanOrEqual(limit);
    }
  });

  it("is immutable", () => {
    expect(Object.isFrozen(deck)).toBe(true);
    expect(Object.isFrozen(deck.decklist.mainDeck)).toBe(true);
    expect(Object.isFrozen(deck.decklist.eggDeck)).toBe(true);
  });
});

describe("metaDecksForBlock", () => {
  it("returns a block's own decks", () => {
    for (const block of COVERED_BLOCKS) {
      const decks = metaDecksForBlock(block);
      expect(decks.length).toBeGreaterThan(0);
      expect(decks.every((deck) => deck.block === block)).toBe(true);
    }
  });

  it("falls back to the newest covered block for an unrecognized label", () => {
    const newest = COVERED_BLOCKS.at(-1)!;
    const unknownButRecent = metaDecksForBlock("NOT-A-SET");
    expect(unknownButRecent.every((deck) => deck.block === newest)).toBe(true);
    expect(unknownButRecent.length).toBeGreaterThan(0);
  });

  it("never returns a deck from a block newer than the one asked for", () => {
    const requested = blockReleaseDate("BT12")!;
    for (const deck of metaDecksForBlock("BT12")) {
      expect(blockReleaseDate(deck.block)! <= requested).toBe(true);
    }
  });

  it("returns nothing for a block older than every covered one", () => {
    for (const block of ["ST1", "ST2", "ST3", "P"]) {
      expect(metaDecksForBlock(block), `${block} should resolve to no deck`).toEqual([]);
    }
  });

  it("resolves the empty string like any other unrecognized label", () => {
    expect(metaDecksForBlock("")).toEqual(metaDecksForBlock("NOT-A-SET"));
    expect(metaDecksForBlock("")).not.toEqual([]);
  });

  it("returns a frozen array so callers cannot reorder the shared decks", () => {
    expect(Object.isFrozen(metaDecksForBlock("BT10"))).toBe(true);
  });

  it("defaults to decks the server can deal", () => {
    for (const deck of metaDecksForBlock("NOT-A-SET")) {
      expect(validateDecklist(deck.decklist)).toEqual({ ok: true });
    }
  });
});
