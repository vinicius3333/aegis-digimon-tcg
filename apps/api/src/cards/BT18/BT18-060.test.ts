import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT18-060 (Vemmon) — [On Play] reveal top 3; add 1 [Vemmon]-text card to hand AND
// place 1 card named "Vemmon" as the bottom digivolution card of 1 of your Digimon.
// source: documented behavior.
//
// FAILS-WHEN-REVERTED: a [Vemmon]-named card ends up as a digivolution card under a friendly
// Digimon (the place-as-bottom-digivolution clause) AND a [Vemmon] card enters the hand. A
// no-op leaves both the stacks and the hand unchanged.

const VEMMON_NAMED = new Set(["BT11-061", "BT18-060", "BT21-056"]);

describe("BT18-060 [On Play] reveal 3 → add a Vemmon to hand + place a Vemmon as bottom digivolution", () => {
  it("places a Vemmon-named card under a friendly Digimon and adds a Vemmon to hand", async () => {
    const s = setupEngine(
      {
        0: {
          // A friendly Digimon to place the Vemmon under.
          battleArea: [{ card: "BT1-009", dp: 3000, as: "host" }],
          hand: [{ card: "BT18-060", as: "vemmon" }],
          // Top 3 of deck: two Vemmon-named cards + 1 filler.
          deck: ["BT11-061", "BT21-056", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0];
    s.state.memory = 3; // exact play cost
    const vemmonId = s.inst("vemmon").instanceId;

    const handCountBefore = p0?.hand.length ?? 0; // includes the Vemmon being played

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: vemmonId })).toEqual({ ok: true });

    const placedSomewhere = () =>
      p0?.battleArea.some((perm) => perm.stack.some((c) => VEMMON_NAMED.has(c.cardId))) ?? false;
    await settle(placedSomewhere);
    await settle(() => false, 60); // flush the rest of the on-play resolution (deck bottom return)

    // A Vemmon-named card is now a digivolution (stack) card under a friendly Digimon.
    expect(placedSomewhere()).toBe(true);
    // A Vemmon-named card was added to the hand (net hand count unchanged: -1 played +1 added).
    expect(p0?.hand.some((c) => VEMMON_NAMED.has(c.cardId))).toBe(true);
    expect(p0?.hand.length).toBe(handCountBefore);

    // The unclaimed filler card (BT1-009) genuinely moves to the BOTTOM of the deck —
    // not merely flipped face-down in place at the top, which manual deck-array splicing
    // could silently get wrong.
    const deck = p0?.deck ?? [];
    expect(deck.length).toBeGreaterThan(0);
    const fillerIndex = deck.findIndex((c) => c.cardId === "BT1-009");
    expect(fillerIndex).toBe(deck.length - 1);
    expect(deck.every((c) => c.faceUp === false)).toBe(true);
  });
});
