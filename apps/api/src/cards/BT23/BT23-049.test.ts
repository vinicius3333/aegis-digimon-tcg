import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-049.js";

// Trait fixtures for the "By trashing 1 card with the [Dragonkin], [Cyborg], [Device] or
// [CS] trait" cost. Each carries exactly one of the four printed traits so a payment proves
// that token and no other; `nonMatching` (Reptile only) must never be taken.
const TRAIT_FIXTURES = [
  { trait: "Dragonkin", cardId: "AD1-004" },
  { trait: "Cyborg", cardId: "AD1-003" },
  { trait: "Device", cardId: "P-159" },
  { trait: "CS", cardId: "BT22-008" },
] as const;

const NON_MATCHING = "BT1-010"; // Agumon — Reptile only.

/** Seat 0 board with Monodramon out, a staged deck, and the given hand. */
function boardWith(hand: { card: string; as: string }[]) {
  return {
    0: {
      battleArea: [{ card: "BT23-049", as: "mono" }],
      hand,
      deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
    },
    1: { deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"] },
  };
}

/**
 * Run seat 0's real turn through the turn loop, up to and including its Main phase entry.
 * The turn-loop promise is returned wrapped: an `async` function would flatten it and the
 * caller would await the whole game instead of the phase.
 */
async function openOwnMainPhase(s: EngineSetup): Promise<{ loop: Promise<void> }> {
  const loop = s.engine.startTurnLoop();
  await advance(s.engine).waitForMainPhase(0);
  await settle();
  return { loop };
}

async function surrender(s: EngineSetup, loop: Promise<void>): Promise<void> {
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("BT23-049 Monodramon", () => {
  it("matches the catalog record and the official printed text", () => {
    expect(getCardDefinition("BT23-049")).toMatchObject({
      cardId: "BT23-049",
      nameEn: "Monodramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Mini Dragon", "CS"],
      inheritedEffectText: "[All Turns] This Digimon gets +1000 DP.",
    });
    // Printed text, whitespace-normalized against the official card-list dump.
    expect(getCardDefinition("BT23-049")!.effectText?.replace(/\s+/g, " ").trim()).toBe(
      "[Digivolve] Lv.2 w/[CS] trait: Cost 0 [Start of Your Main Phase] By trashing 1 card with the [Dragonkin], [Cyborg], [Device] or [CS] trait from your hand, ＜Draw 1＞ and gain 1 memory.",
    );
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("carries one declinable trash cost gating the draw, with the memory gain uncosted", () => {
    const actions = (compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any).actions;
    expect(actions).toHaveLength(2);
    expect(actions[0]).toMatchObject({
      kind: "Draw",
      controller: "mine",
      amount: 1,
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "trash",
        target: {
          filter: {
            zone: "hand",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Dragonkin", "Cyborg", "Device", "CS"], match: "trait" }],
          },
          count: 1,
        },
      },
    });
    // The single printed cost sits on the draw only: a cost on both payloads would trash two
    // cards, which comprehensive §15-7-3 forbids.
    expect(actions[1]).toEqual({ kind: "GainMemory", amount: 1 });
  });

  it("trashes exactly 1 matching card, draws 1 and gains 1 memory on the real Start of Your Main Phase", async () => {
    const s = setupEngine(
      boardWith([
        { card: "BT23-053", as: "matching" },
        { card: NON_MATCHING, as: "nonMatching" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const matchingId = s.inst("matching").instanceId;
    const nonMatchingId = s.inst("nonMatching").instanceId;
    const deckBefore = s.state.players[0]!.deck.length;
    const handBefore = s.state.players[0]!.hand.length;

    const { loop } = await openOwnMainPhase(s);

    const me = s.state.players[0]!;
    expect(me.trash.map((card) => card.instanceId)).toEqual([matchingId]);
    expect(me.hand.some((card) => card.instanceId === nonMatchingId)).toBe(true);
    // One card left the hand as the cost and one entered it from the deck: the hand size is
    // unchanged, and the deck is exactly one card shorter. §15-7-3 forbids a second payment.
    expect(me.hand).toHaveLength(handBefore);
    expect(me.deck).toHaveLength(deckBefore - 1);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();

    await surrender(s, loop);
  });

  it.each(TRAIT_FIXTURES)("accepts a [$trait] card as the payment and never the non-matching card", async (fixture) => {
    const s = setupEngine(
      boardWith([
        { card: fixture.cardId, as: "matching" },
        { card: NON_MATCHING, as: "nonMatching" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const matchingId = s.inst("matching").instanceId;

    const { loop } = await openOwnMainPhase(s);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([matchingId]);
    expect(s.state.memory).toBe(1);

    await surrender(s, loop);
  });

  it("aborts the whole clause when no hand card carries a printed trait, per rule 15-7-2", async () => {
    const s = setupEngine(boardWith([{ card: NON_MATCHING, as: "nonMatching" }]), {
      autoAcceptOptional: true,
      autoSelectCards: true,
    });
    const deckBefore = s.state.players[0]!.deck.length;
    const handBefore = s.state.players[0]!.hand.length;

    const { loop } = await openOwnMainPhase(s);

    const me = s.state.players[0]!;
    expect(me.trash).toHaveLength(0);
    expect(me.hand).toHaveLength(handBefore);
    expect(me.deck).toHaveLength(deckBefore);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();

    await surrender(s, loop);
  });

  it("lets the controller decline the optional processing condition, per rule 15-7-4", async () => {
    const s = setupEngine(
      boardWith([
        { card: "BT23-053", as: "matching" },
        { card: NON_MATCHING, as: "nonMatching" },
      ]),
      { autoDeclineOptional: true },
    );
    const matchingId = s.inst("matching").instanceId;
    const deckBefore = s.state.players[0]!.deck.length;
    const handBefore = s.state.players[0]!.hand.length;

    const { loop } = await openOwnMainPhase(s);

    const me = s.state.players[0]!;
    expect(me.hand.some((card) => card.instanceId === matchingId)).toBe(true);
    expect(me.trash).toHaveLength(0);
    expect(me.hand).toHaveLength(handBefore);
    expect(me.deck).toHaveLength(deckBefore);
    expect(s.state.memory).toBe(0);

    await surrender(s, loop);
  });

  it("does not fire on the opponent's main phase", async () => {
    const s = setupEngine(
      boardWith([
        { card: "BT23-053", as: "matching" },
        { card: "BT23-055", as: "secondMatching" },
        { card: NON_MATCHING, as: "nonMatching" },
      ]),
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    expect(s.state.players[0]!.trash).toHaveLength(1);
    const trashAfterOwnTurn = s.state.players[0]!.trash.length;
    const handAfterOwnTurn = s.state.players[0]!.hand.length;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(trashAfterOwnTurn);
    expect(s.state.players[0]!.hand).toHaveLength(handAfterOwnTurn);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle();
    // The next own turn fires it again: the trigger has no once-per-turn limit.
    expect(s.state.players[0]!.trash).toHaveLength(trashAfterOwnTurn + 1);

    await surrender(s, loop);
  });

  it("grants the inherited host +1000 DP on both turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-053", as: "host", under: ["BT23-049"] }],
        deck: ["BT1-011", "BT1-012", "BT1-013"],
      },
      1: { deck: ["BT1-011", "BT1-012", "BT1-013"] },
    });
    await s.ready();
    const printedDp = getCardDefinition("BT23-053")!.dp!;
    expect(s.perm("host").currentDP).toBe(printedDp + 1000);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(printedDp + 1000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(printedDp + 1000);

    s.engine.applyIntent(1, { type: "surrender" });
    await loop;

    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
  });

  it("digivolves for 0 off an off-color Lv.2 [CS] source through the alternate route", async () => {
    const s = setupEngine({
      0: {
        // BT23-002 Yokomon: Green Lv.2 with the [CS] trait — the printed Black Lv.2 EvoCost
        // cannot apply, so only the alternate requirement can legalise this digivolution.
        breeding: { card: "BT23-002", as: "base" },
        hand: [{ card: "BT23-049", as: "mono" }],
        deck: ["BT1-011", "BT1-012"],
      },
    });
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mono").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("mono").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("mono").instanceId);
    // Digivolving draws 1 (the digivolution bonus draw).
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("digivolves for 0 off the printed Black Lv.2 EvoCost without the alternate flag", async () => {
    const s = setupEngine({
      0: {
        // BT11-005 Koromon: Black Lv.2 with no [CS] trait — printed EvoCost only.
        breeding: { card: "BT11-005", as: "base" },
        hand: [{ card: "BT23-049", as: "mono" }],
        deck: ["BT1-011", "BT1-012"],
      },
    });
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mono").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("mono").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("mono").instanceId);
  });

  it("rejects an off-color Lv.2 source without the [CS] trait", async () => {
    const s = setupEngine({
      0: {
        // BT1-003 Upamon: Blue Lv.2, Amphibian — neither the printed EvoCost nor the alternate.
        breeding: { card: "BT1-003", as: "base" },
        hand: [{ card: "BT23-049", as: "mono" }],
        deck: ["BT1-011", "BT1-012"],
      },
    });
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mono").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("mono").instanceId);
  });
});
