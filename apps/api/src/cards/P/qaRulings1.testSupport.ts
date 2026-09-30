import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { validateDecklist, type DecklistValidation } from "../../engine/deckValidation.js";

const FILLER_CARD_IDS = [
  "BT1-012", "BT1-013", "BT1-014", "BT1-015", "BT1-016", "BT1-017", "BT1-018", "BT1-019",
  "BT1-020", "BT1-021", "BT1-022", "BT1-023", "BT1-024",
];

/** A 50-card main deck holding `cards` plus four-copy filler of unrelated commons. */
export function validateMainDeckWith(cards: string[]): DecklistValidation {
  const mainDeck = [...cards];
  for (const cardId of FILLER_CARD_IDS) {
    for (let copy = 0; copy < 4 && mainDeck.length < 50; copy++) mainDeck.push(cardId);
  }
  return validateDecklist({ mainDeck, eggDeck: [] });
}

export function copies(cardId: string, count: number): string[] {
  return Array.from({ length: count }, () => cardId);
}

interface MemoryBoostRulings {
  cardId: string;
  name: string;
  sameColorOption: string;
  colorRequirementQno: string;
  delayQno: string;
}

/**
 * The two Memory Boost! color rulings: a Memory Boost! in the battle area is not a
 * colored Digimon or Tamer, so it can't pay for a same-color Option's color requirement,
 * but its own <Delay> needs no color at all.
 */
export function memoryBoostColorRulings(rulings: MemoryBoostRulings): void {
  describe(`${rulings.cardId} ${rulings.name} — KB Q&A rulings`, () => {
    it(`doesn't meet a same-color Option's color requirement from the battle area (${rulings.colorRequirementQno})`, async () => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: rulings.cardId, as: "boost" }],
          hand: [{ card: rulings.sameColorOption, as: "option" }],
        },
      });
      s.state.memory = 10;
      await s.ready();

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
        ok: false,
        reason: "color-requirement-unmet",
      });
    });

    it(`activates <Delay> with no same-color Digimon or Tamer in play (${rulings.delayQno})`, async () => {
      const s = setupEngine({ 0: { battleArea: [{ card: rulings.cardId, as: "boost" }] } });
      s.state.memory = 0;
      await s.ready();
      const boostId = s.perm("boost").topCard.instanceId;
      const delay = observe(s.engine)
        .activatableEffects(s.perm("boost"))
        .find(({ description }) => /delay/i.test(description ?? ""));
      expect(delay).toBeDefined();

      expect(
        s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: boostId, effectKey: delay!.effectKey }),
      ).toEqual({ ok: true });
      await settle(() => s.state.memory === 2 && s.state.pendingDecision === undefined);

      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([boostId]);
      expect(s.state.memory).toBe(2);
    });
  });
}
