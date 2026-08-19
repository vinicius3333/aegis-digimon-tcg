import { describe, expect, it } from "vitest";
import { CardKind, getCardDefinition, type FamousDeck } from "@aegis/shared";
import { CATALOG_DECKS } from "@aegis/shared";
import { getEffectModule } from "./effects/registry.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

/**
 * Deck-level contract tests.
 *
 * These are deliberately driven by the committed deck catalog instead of a
 * hand-maintained list. Every stored deck gets a catalog assertion and a small
 * interaction matrix. The matrix exercises the real interpreter with the
 * deck's own effect-bearing cards and automatically keeps source, inherited,
 * complex-keyword, and ordering cases visible as the catalog grows.
 */

// This matrix drives the permanent play intent. Options have a separate use
// intent and are covered by the card-specific suites.
const PLAYABLE_KINDS = new Set([CardKind.Digimon, CardKind.Tamer]);
const COMPLEX_PATTERN = /DigiXros|DNA Digivolve|\bLink\b|Partition|Blast Digivolve|\bACE\b/i;
const ORDER_PATTERN = /order|top of your deck|bottom of your deck|place .* (top|bottom)/i;
const SOURCE_PATTERN = /source|from (your|the) (trash|hand)|digivolution cards|under your/i;

function cardIds(deck: FamousDeck): string[] {
  return [...new Set([...deck.decklist.mainDeck, ...deck.decklist.eggDeck])];
}

function definitionFor(deck: FamousDeck, cardId: string) {
  const definition = getCardDefinition(cardId);
  if (!definition) throw new Error(`${deck.deckId} references unknown card ${cardId}`);
  return definition;
}

function cardText(cardId: string): string {
  const definition = getCardDefinition(cardId);
  return `${definition?.effectText ?? ""} ${definition?.inheritedEffectText ?? ""}`;
}

function candidatesFor(deck: FamousDeck): string[] {
  const ids = cardIds(deck).filter((cardId) => {
    const definition = definitionFor(deck, cardId);
    return definition.kinds.some((kind) => PLAYABLE_KINDS.has(kind as CardKind)) && getEffectModule(cardId);
  });
  const selected: string[] = [];
  const predicates = [
    (text: string) => SOURCE_PATTERN.test(text),
    (text: string) => Boolean(getCardDefinition(text)?.inheritedEffectText),
    (text: string) => COMPLEX_PATTERN.test(cardText(text)),
    (text: string) => ORDER_PATTERN.test(cardText(text)),
  ];
  for (const predicate of predicates) {
    const match = ids.find((cardId) => predicate(cardId));
    if (match && !selected.includes(match)) selected.push(match);
  }
  const fallback = ids.find((cardId) => !selected.includes(cardId));
  if (fallback) selected.push(fallback);
  return selected;
}

function interactionBoard(cardId: string) {
  return {
    0: {
      hand: [{ card: cardId, as: "played" }],
      deck: ["BT1-009", "BT1-027", "BT1-009", "BT1-027"],
      trash: ["BT1-009", "BT1-027"],
      security: ["BT1-090", "BT1-090", "BT1-090"],
      battleArea: [{ card: "BT1-009", as: "ally" }],
    },
    1: {
      deck: ["BT1-009", "BT1-027", "BT1-009"],
      security: ["BT1-090", "BT1-090", "BT1-090"],
      battleArea: [{ card: "BT1-027", as: "opponent" }],
    },
  };
}

describe("catalog-driven deck interactions", () => {
  const decks = [...CATALOG_DECKS].reverse();

  it("keeps every stored deck legal and every effect-bearing card registered", () => {
    const missingModules: string[] = [];
    for (const deck of decks) {
      expect({ deckId: deck.deckId, main: deck.decklist.mainDeck.length }).toEqual({
        deckId: deck.deckId,
        main: 50,
      });
      expect(deck.decklist.eggDeck.length).toBeLessThanOrEqual(5);
      for (const cardId of cardIds(deck)) {
        const definition = definitionFor(deck, cardId);
        if ((definition.effectText || definition.inheritedEffectText) && !getEffectModule(cardId)) {
          missingModules.push(`${deck.deckId} / ${cardId}`);
        }
      }
    }
    expect(missingModules).toEqual([]);
  });

  it("keeps all requested interaction families represented", () => {
    const coverage = { source: 0, inherited: 0, complex: 0, order: 0 };
    for (const deck of decks) {
      for (const cardId of candidatesFor(deck)) {
        const text = cardText(cardId);
        if (SOURCE_PATTERN.test(text)) coverage.source += 1;
        if (getCardDefinition(cardId)?.inheritedEffectText) coverage.inherited += 1;
        if (COMPLEX_PATTERN.test(text)) coverage.complex += 1;
        if (ORDER_PATTERN.test(text)) coverage.order += 1;
      }
    }
    expect(coverage.source).toBeGreaterThan(0);
    expect(coverage.inherited).toBeGreaterThan(0);
    expect(coverage.complex).toBeGreaterThan(0);
    expect(coverage.order).toBeGreaterThan(0);
  });

  for (const deck of decks) {
    const candidates = candidatesFor(deck);
    it(`${deck.deckId} (${deck.archetype}) resolves representative interactions`, async () => {
      expect(candidates, `${deck.deckId} has no effect-bearing playable card`).not.toHaveLength(0);
      for (const cardId of candidates) {
        const setup = setupEngine(interactionBoard(cardId), {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoChooseOption: true,
          autoOrderCards: true,
        });
        setup.state.memory = 50;
        const played = setup.inst("played");
        const result = setup.engine.applyIntent(0, {
          type: "playCard",
          instanceId: played.instanceId,
        });
        expect(result.ok, `${deck.deckId} / ${cardId}`).toBe(true);
        await settle(() => false, 80);
        assertNoLoudGap(setup);
      }
    });
  }
});
