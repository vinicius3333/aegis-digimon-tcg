import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import {
  makeInstance as instance,
  setupEngine as setup,
  settle,
} from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT11-089 (Akiho Rindou) — its [On Play] effect reveals the top 4 cards of the
// deck and is supposed to add 1 red Digimon with [Vaccine] in its traits among them to
// hand, returning the rest to the bottom of the deck.
//
// FAILS-WHEN-REVERTED: the pre-fix module selected the matching red/Vaccine card via
// `ctx.ask.selectCards` but never called `ctx.fx.returnToHand` on the selection — it only
// computed the "rest" (unselected cards) and returned THOSE to the deck, silently dropping
// the selected card back into the deck bottom along with everything else instead of the
// hand. The 7th known instance of the reveal-to-hand no-op bug class.
describe("BT11-089 [On Play] reveal 4 -> add 1 red Vaccine Digimon to hand", () => {
  it("moves the selected red/Vaccine Digimon to hand, not the deck bottom", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;

    const source = instance("BT11-089", 0, false);
    p0.hand.push(source);
    s.state.memory = 10;

    // Deck: 1 red/Vaccine Digimon (AD1-004 WarGreymon) among 3 filler cards, all within
    // the top 4 revealed.
    p0.deck.push(instance("AD1-004", 0, false)); // Red, [Vaccine] — the intended pick
    p0.deck.push(instance("BT1-009", 0, false)); // filler
    p0.deck.push(instance("BT1-009", 0, false)); // filler
    p0.deck.push(instance("BT1-009", 0, false)); // filler

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: source.instanceId })).toEqual({
      ok: true,
    });

    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "BT11-089"), 200);
    await settle(() => false, 60); // flush the reveal/select resolution

    expect(p0.hand.some((c) => c.cardId === "AD1-004")).toBe(true);
    expect(p0.deck.some((c) => c.cardId === "AD1-004")).toBe(false);
  });
});
