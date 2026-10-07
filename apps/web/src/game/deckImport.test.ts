import { describe, expect, it } from "vitest";
import { parseDeckList } from "./decks";

/* Samples copied from each site's export (issue #5006 and the exporters' own output). */
const DIGIMON_META_TABLETOP =
  '["Exported from digimonmeta.com","BT26-005","BT26-005","BT26-005","BT26-005","ST24-04","ST24-04","ST24-04","ST24-04","ST24-12","ST24-12","ST24-12","BT26-036","BT26-036","BT26-036","BT26-036","ST24-03","ST24-03","ST24-03","ST24-03","ST24-05","ST24-05","ST24-05","ST24-05","ST24-06","ST24-06","ST24-06","ST24-06","ST24-10","ST24-10","ST24-10","ST24-10","ST24-07","ST24-07","ST24-07","ST24-07","BT26-049","BT26-049","BT26-049","BT25-104","BT26-050","BT26-050","BT26-050","ST24-13","ST24-13","BT25-087","BT25-087","BT25-087","BT26-091","BT26-091","BT26-091","ST24-15","ST24-15","ST24-15","ST24-15"]';

const count = (cards: readonly string[], cardId: string) => cards.filter((id) => id === cardId).length;

describe("parseDeckList formats", () => {
  it("reads a Digimon Meta Tabletop Simulator code, eggs by card type", () => {
    const deck = parseDeckList(DIGIMON_META_TABLETOP);
    expect(deck.eggDeck).toEqual(["BT26-005", "BT26-005", "BT26-005", "BT26-005"]);
    expect(deck.mainDeck).toHaveLength(50);
    expect(count(deck.mainDeck, "ST24-12")).toBe(3);
    expect(count(deck.mainDeck, "BT25-104")).toBe(1);
    expect(deck).toMatchObject({ skipped: 0, trimmed: 0 });
  });

  it.each([
    ["DigimonCard.io", "https://digimoncard.io"],
    ["digimoncard.app", "https://digimoncard.app"],
    ["digimoncard.dev", "https://digimoncard.dev"],
    ["DCGO", "DCGO"],
  ])("reads the %s Tabletop Simulator header", (_site, origin) => {
    const deck = parseDeckList(`["Exported from ${origin}","BT1-001","BT1-010","BT1-010"]`);
    expect(deck.eggDeck).toEqual(["BT1-001"]);
    expect(deck.mainDeck).toEqual(["BT1-010", "BT1-010"]);
  });

  it("reads DigimonCard.io text with names that hold colons and parentheses", () => {
    const deck = parseDeckList(
      "// DigimonCard.io Deck List\n2 Imperialdramon: Paladin Mode EX1-073\n3 Agumon (X Antibody) BT1-010\n4 Yokomon BT1-001",
    );
    expect(deck.mainDeck).toEqual(["EX1-073", "EX1-073", "BT1-010", "BT1-010", "BT1-010"]);
    expect(deck.eggDeck).toEqual(["BT1-001", "BT1-001", "BT1-001", "BT1-001"]);
  });

  it("reads digimoncard.dev text with padded names and trailing spaces", () => {
    const deck = parseDeckList("// Digimon DeckList\n\n4 Agumon      BT1-010 \n1 Yokomon     BT1-001 ");
    expect(deck.mainDeck).toEqual(["BT1-010", "BT1-010", "BT1-010", "BT1-010"]);
    expect(deck.eggDeck).toEqual(["BT1-001"]);
  });

  it("reads both Untap bracket styles", () => {
    expect(parseDeckList("4 Agumon (DCG) (BT1-010) ").mainDeck).toHaveLength(4);
    expect(parseDeckList("2 Agumon [DCG] (BT1-010)").mainDeck).toEqual(["BT1-010", "BT1-010"]);
  });

  it("reads the count from any column and accepts 4x", () => {
    expect(parseDeckList("BT1-010 Agumon 3").mainDeck).toHaveLength(3);
    expect(parseDeckList("4x BT1-010").mainDeck).toHaveLength(4);
    expect(parseDeckList("BT1-010").mainDeck).toEqual(["BT1-010"]);
  });

  it("keeps alternate art from DCGO and digimoncard.app ids", () => {
    const deck = parseDeckList("// DeckList\n\n2 Agumon   BT1-010_P1 \n1 Agumon BT1-010");
    expect(deck.mainDeck).toEqual(["BT1-010", "BT1-010", "BT1-010"]);
    expect(deck.mainDeckArts).toEqual(["BT1-010_P1", "BT1-010_P1", "BT1-010"]);
  });

  it("matches zero-padded starter set numbers", () => {
    expect(parseDeckList('["ST01-01"]').eggDeck).toEqual(["ST1-01"]);
  });

  it("caps copies across every line of the list", () => {
    const deck = parseDeckList("3 Agumon BT1-010\n3 Agumon BT1-010_P1");
    expect(deck.mainDeck).toHaveLength(4);
  });

  it("skips unknown card numbers and ignores section headers", () => {
    const deck = parseDeckList("Main Deck\n4 Agumon BT1-010\nDigi-Egg\n2 Unknown ZZ9-999");
    expect(deck.mainDeck).toHaveLength(4);
    expect(deck.skipped).toBe(1);
  });

  it("still reads a Tabletop Simulator code that lost its closing bracket", () => {
    expect(parseDeckList('["Exported from digimonmeta.com","BT1-010","BT1-010",').mainDeck).toHaveLength(2);
  });
});
