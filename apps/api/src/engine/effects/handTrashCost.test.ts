import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

// Regression: a trash-cost phrased "... in your hand" (vs "from your hand") must be
// detected as a HAND cost. The interpreter's payCost detector previously only matched
// /from your hand/, so an "in your hand" cost fell through to the permanent-trash path,
// failed to pay, and aborted the whole action — so an [On Play] "By trashing 1 card in
// your hand, Draw 2" drew nothing and the turn just ended (the symptom looked like the
// On Play never firing, especially when the play cost crossed memory to the opponent).

describe('trash-cost "in your hand" is treated as a hand cost', () => {
  for (const mem of [5, 2]) {
    it(`ST12-12 [On Play] (mem ${mem}, ${mem >= 3 ? "no cross" : "crosses"}): trashes 1 from hand and draws`, async () => {
      const s = setupEngine(
        {
          0: {
            // BT1-009 and BT1-045 are candidates to trash (2 -> a real choice).
            hand: [{ card: "ST12-12", as: "card" }, "BT1-009", "BT1-045"],
            deck: ["BT1-064", "BT1-064", "BT1-064", "BT1-064", "BT1-064", "BT1-064"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const p0 = s.state.players[0] as PlayerState;
      const deckBefore = p0.deck.length;
      s.state.memory = mem;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("card").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => p0.deck.length < deckBefore, 600);

      const drew = deckBefore - p0.deck.length;
      // The hand-discard cost must have prompted a card selection...
      expect(s.decisions.some((d) => d.req.kind === "selectCards")).toBe(true);
      // ...trashed exactly 1 card from hand...
      expect(p0.trash.length).toBe(1);
      // ...and drawn exactly 2 (the single cost-bearing Draw 2 — not 4 from the old
      // duplicate bare Draw the runtime record emitted off the reminder text).
      expect(drew).toBe(2);
    });
  }
});
