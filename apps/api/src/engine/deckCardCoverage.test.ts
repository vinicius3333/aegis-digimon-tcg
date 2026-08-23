import { describe, expect, it } from "vitest";
import { ALL_FAMOUS_DECKS, CardKind, getCardDefinition } from "@aegis/shared";
import { getEffectModule } from "./effects/registry.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

/**
 * Card-level deck audit.
 *
 * The interaction suites exercise hand-picked archetype procedures. This audit
 * complements them by entering every effect-bearing Digimon/Tamer in every
 * stored deck through the real play path, so a newly added catalog card cannot
 * silently remain unregistered or fail with an unsupported interpreter action.
 */

function deckCardIds(deck: (typeof ALL_FAMOUS_DECKS)[number]): string[] {
  return [...new Set([...deck.decklist.mainDeck, ...deck.decklist.eggDeck])];
}

const deckCardMap = new Map<string, string[]>();
const effectBearingDeckCards = new Map<string, string[]>();
for (const deck of [...ALL_FAMOUS_DECKS].reverse()) {
  for (const cardId of deckCardIds(deck)) {
    const definition = getCardDefinition(cardId);
    if (
      definition === undefined ||
      (definition.effectText === undefined && definition.inheritedEffectText === undefined)
    )
      continue;
    const allDecks = effectBearingDeckCards.get(cardId) ?? [];
    allDecks.push(deck.deckId);
    effectBearingDeckCards.set(cardId, allDecks);
    if (
      !definition.kinds.some((kind) => kind === CardKind.Digimon || kind === CardKind.Tamer || kind === CardKind.Option)
    )
      continue;
    if (getEffectModule(cardId) === undefined) continue;
    const decks = deckCardMap.get(cardId) ?? [];
    decks.push(deck.deckId);
    deckCardMap.set(cardId, decks);
  }
}
const auditedCards = [...deckCardMap.entries()].map(([cardId, deckIds]) => ({ cardId, deckIds }));

describe("catalog deck card coverage", () => {
  it("does not omit an effect-bearing playable card from the executable audit", () => {
    expect(auditedCards.length).toBeGreaterThan(0);
    expect(auditedCards.every(({ deckIds }) => deckIds.length > 0)).toBe(true);
  });

  it("registers every effect-bearing card in every famous deck, including Digi-Eggs", () => {
    const missing = [...effectBearingDeckCards.keys()].filter((cardId) => getEffectModule(cardId) === undefined);
    expect(missing, `effect-bearing deck cards without an effect module: ${missing.join(", ")}`).toEqual([]);
  });

  for (const { cardId, deckIds } of auditedCards) {
    it(`${cardId} enters through its registered effect module (${deckIds.join(", ")})`, async () => {
      const preferredLinkRecipients: string[] = [];
      const setup = setupEngine(
        {
          0: {
            hand: [{ card: cardId, as: "audited" }],
            deck: ["BT1-009", "BT1-086", "BT1-009", "BT1-086", "BT1-009"],
            trash: ["BT1-009", "BT1-086"],
            security: ["BT1-090", "BT1-090", "BT1-090"],
            battleArea: [
              { card: "BT1-009", as: "ally-red" },
              "BT1-086",
              "BT1-050",
              "BT1-064",
              "BT10-062",
              "BT10-071",
              "AD1-005",
            ],
          },
          1: {
            deck: ["BT1-009", "BT1-086", "BT1-009"],
            security: ["BT1-090", "BT1-090", "BT1-090"],
            battleArea: [{ card: "BT1-086", as: "opponent" }],
          },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoChooseOption: true,
          autoOrderCards: true,
          // Link Options such as BT25-100 and ST22-09 choose a recipient permanent.
          // Prefer the staged battle-area permanents so this generic audit does not
          // turn an otherwise valid card into a false "recipient missing" gap.
          preferInstanceIds: preferredLinkRecipients,
        },
      );
      preferredLinkRecipients.push(
        ...setup.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId),
      );
      setup.state.memory = 50;
      expect(setup.engine.applyIntent(0, { type: "playCard", instanceId: setup.inst("audited").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => false, 80);
      assertNoLoudGap(setup);
    });
  }
});
