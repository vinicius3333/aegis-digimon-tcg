import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-060.js";

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
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            rest: "deckBottom",
            add: [
              { count: 1, to: "hand" },
              { count: 1, to: "placeUnder", underFilter: { controller: "mine", kind: ["Digimon"] } },
            ],
          },
        ],
      },
      {
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [{ kind: "Replacement", event: "wouldDigivolve" }],
      },
    ]);
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
    expect(p0?.hand.map(({ cardId }) => cardId)).toContain("BT11-061");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toContain("BT21-056");
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    expect(s.state.memory).toBe(0);

    // The unclaimed filler card (BT1-009) genuinely moves to the BOTTOM of the deck —
    // not merely flipped face-down in place at the top, which manual deck-array splicing
    // could silently get wrong.
    const deck = p0?.deck ?? [];
    expect(deck.length).toBeGreaterThan(0);
    const fillerIndex = deck.findIndex((c) => c.cardId === "BT1-009");
    expect(fillerIndex).toBe(deck.length - 1);
    expect(deck.every((c) => c.faceUp === false)).toBe(true);
    assertNoLoudGap(s);
  });

  it("Q2992 adds every available result even when the named-card branch is unavailable", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-060", as: "vemmon" }],
          deck: ["BT11-065", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vemmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT11-065"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT11-065");
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.slice(-2).map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    assertNoLoudGap(s);
  });

  it("reduces a Vemmon-text evolution by one only once per turn and only from its host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-065", as: "host", under: ["BT18-060"] },
          { card: "BT11-065", as: "other", under: ["BT18-060"] },
          { card: "BT11-065", as: "plain" },
        ],
        hand: [
          { card: "BT11-070", as: "destromonA" },
          { card: "BT11-070", as: "destromonB" },
          { card: "BT11-111", as: "galacticmon" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();
    s.state.memory = 10;

    expect(observe(s.engine).costReduction("wouldDigivolve", s.perm("host"), getCardDefinition("BT11-070"))).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("destromonA").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT11-070");

    expect(s.state.memory).toBe(6);
    expect(observe(s.engine).costReduction("wouldDigivolve", s.perm("other"), getCardDefinition("BT11-070"))).toBe(1);
    expect(observe(s.engine).costReduction("wouldDigivolve", s.perm("plain"), getCardDefinition("BT11-070"))).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("galacticmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT11-111");
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).costReduction("wouldDigivolve", s.perm("host"), getCardDefinition("BT1-078"))).toBe(0);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).costReduction("wouldDigivolve", s.perm("other"), getCardDefinition("BT11-070"))).toBe(0);
    assertNoLoudGap(s);
  });
});
