import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const RED = "BT1-009";
const YELLOW = "BT1-045";
const GREEN = "BT1-064";
const BLUE = "BT1-027";
const PURPLE = "BT10-079";
const BLACK = "BT10-022";

const TABLE: Record<string, { match: string; non1: string; non2: string }> = {
  "LM-033": { match: RED, non1: YELLOW, non2: GREEN },
  "LM-034": { match: BLUE, non1: YELLOW, non2: GREEN },
  "LM-035": { match: YELLOW, non1: RED, non2: GREEN },
  "LM-036": { match: GREEN, non1: RED, non2: YELLOW },
  "LM-037": { match: YELLOW, non1: RED, non2: GREEN },
  "LM-038": { match: PURPLE, non1: RED, non2: YELLOW },
  "LM-045": { match: RED, non1: GREEN, non2: BLUE },
  "LM-046": { match: BLUE, non1: RED, non2: YELLOW },
  "LM-047": { match: YELLOW, non1: RED, non2: BLUE },
  "LM-048": { match: GREEN, non1: RED, non2: YELLOW },
  "LM-049": { match: BLUE, non1: RED, non2: YELLOW },
  "LM-050": { match: RED, non1: YELLOW, non2: GREEN },
  "LM-051": { match: RED, non1: YELLOW, non2: BLUE },
  "LM-052": { match: BLUE, non1: RED, non2: GREEN },
  "LM-053": { match: PURPLE, non1: RED, non2: YELLOW },
};

const PRINTED_COLOR: Record<string, string> = {
  "LM-033": RED,
  "LM-034": BLUE,
  "LM-035": YELLOW,
  "LM-036": GREEN,
  "LM-037": BLACK,
  "LM-038": PURPLE,
  "LM-045": RED,
  "LM-046": BLUE,
  "LM-047": YELLOW,
  "LM-048": GREEN,
  "LM-049": BLACK,
  "LM-050": PURPLE,
  "LM-051": RED,
  "LM-052": BLUE,
  "LM-053": BLACK,
};

describe("reveal-add family — Memory Boost! primary (reveal 3, add 1 of the color pair, rest to deck)", () => {
  for (const [cardId, { match, non1, non2 }] of Object.entries(TABLE)) {
    it(`${cardId}: adds the matching Digimon to hand and returns the rest to the deck`, async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: PRINTED_COLOR[cardId]!, dp: 3000 }],
            hand: [{ card: cardId, as: "option", faceUp: true }],
            deck: [{ card: match }, { card: non1 }, { card: non2 }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
      );
      const p0 = s.state.players[0] as PlayerState;
      s.state.memory = 3;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => p0.hand.some((c) => c.cardId === match));

      expect(p0.hand.some((c) => c.cardId === match)).toBe(true);
      expect(p0.deck.filter((c) => c.cardId === non1).length).toBe(1);
      expect(p0.deck.filter((c) => c.cardId === non2).length).toBe(1);
      expect(p0.deck.some((c) => c.cardId === match)).toBe(false);
    });
  }
});
