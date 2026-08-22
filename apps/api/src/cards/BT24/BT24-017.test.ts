import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type Permanent, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT24-017.js";

// BT24-017 Medusamon — [When Digivolving] (documented behavior: the card behavior source):
//   "Delete 1 of your opponent's lowest DP Digimon. Then, by returning 2 cards from
//    their trash to the bottom of the deck, they play 2 [Petrification] Tokens.
//    After, this Digimon gets +2000 DP for each of your opponent's Digimon until their
//    turn ends."
//
// Binding KB rulings (node tools/kb/query.mjs card BT24-017):
//   Q5594: the [Petrification] Tokens are played as the OPPONENT's Digimon.
//   Q5591/Q5592: the "by returning 2 cards from their trash to the bottom of the deck"
//     is a cost — both the tokens and the +DP only happen if EXACTLY 2 cards are
//     returned; returning 1 (or 0) does not meet the "by" condition.
//
// The declarative effect record was badly miscompiled (it folded the [Petrification] Token's own
// sub-effects into Medusamon, dropped the "by" cost, spawned tokens on the owner's side,
// and lost the per-Digimon DP scaling). This file is now backed by a hand-written
// override (BT24-017.ts) that models all three faithfully:
//   1. the "by returning 2 cards from the opponent's trash to the deck bottom" cost;
//   2. the [Petrification] Tokens entering on the OPPONENT's side (Q5594);
//   3. +2000 DP per opponent Digimon (Q5591/Q5592 gate the tokens on the cost).

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

const SELF_PERMANENT = "SELF-MEDUSAMON";

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT24-017",
    set: "BT24",
    nameEn: "Medusamon",
    kinds: ["Digimon"] as never,
    colors: ["Red"] as never,
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function fakePermanent(over: Partial<Permanent>): Permanent {
  return {
    permanentId: "p?",
    controllerSeat: 1 as Seat,
    topCard: undefined,
    stack: [] as never,
    linked: [] as never,
    baseDP: 0,
    currentDP: 0,
    isSuspended: false,
    inBreeding: false,
    ...over,
  } as Permanent;
}

function makeSource(): CardSource {
  const self = fakePermanent({
    permanentId: SELF_PERMANENT,
    controllerSeat: 0 as Seat,
    topCard: { instanceId: "self-top", cardId: "BT24-017", ownerSeat: 0, faceUp: true } as never,
  });
  return {
    instanceId: "INST#MEDUSA",
    cardId: "BT24-017",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => self,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

/**
 * `opponentDigimon` opponent Digimon (plus the self Medusamon on the owner's side so the
 * IR's youHave gate is satisfied). `opponentTrash` only sizes the trash for the "by" cost.
 */
function makeContext(opts: { recorder: Recorder; opponentDigimon: number; opponentTrash?: number }): EffectContext {
  const rec = opts.recorder;
  const record =
    (verb: string) =>
    (...args: unknown[]) => {
      rec.calls.push({ verb, args });
      return undefined as never;
    };

  const self = makeSource().permanent()!;
  const opponentArea: Permanent[] = Array.from({ length: opts.opponentDigimon }, (_, i) =>
    fakePermanent({
      permanentId: `OPP-DIGI-${i}`,
      controllerSeat: 1 as Seat,
      topCard: { instanceId: `od${i}`, cardId: `OPP-D${i}`, ownerSeat: 1, faceUp: true } as never,
    }),
  );
  const opponentTrash = Array.from({ length: opts.opponentTrash ?? 0 }, (_, i) => ({
    instanceId: `otrash${i}`,
    cardId: `OPP-TR${i}`,
    ownerSeat: 1 as Seat,
  }));

  const players = [
    { seat: 0, battleArea: [self], security: [], hand: [], deck: [], trash: [] },
    { seat: 1, battleArea: opponentArea, security: [], hand: [], deck: [], trash: opponentTrash },
  ];

  const allPermanents = [self, ...opponentArea];
  const game: GameAccess = {
    state: { memory: 3, players, turnSeat: 0 } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: (id) => allPermanents.find((p) => p.permanentId === id),
    definitionOf: (card) => fakeDefinition({ cardId: card.cardId, kinds: ["Digimon"] as never }),
  };

  const fx = {
    deletePermanent: async (...a: unknown[]) => {
      rec.calls.push({ verb: "deletePermanent", args: a });
      return (a[0] as string[]).length;
    },
    playToken: async (...a: unknown[]) => {
      rec.calls.push({ verb: "playToken", args: a });
      return undefined;
    },
    modifyDP: record("modifyDP"),
    returnToDeck: record("returnToDeck"),
    returnToHand: record("returnToHand"),
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return { source: makeSource(), trigger: {}, game, fx, ask };
}

describe("BT24-017 Medusamon [When Digivolving]", () => {
  const module = getEffectModule("BT24-017");

  it("registers on import", () => {
    expect(module, "BT24-017 must self-register on import").toBeDefined();
  });

  it("routes the digivolve clause to WhenDigivolving only", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source).length).toBeGreaterThanOrEqual(1);
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
  });

  it("deletes 1 of the opponent's Digimon", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, opponentDigimon: 1, opponentTrash: 2 });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const deletes = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deletes).toHaveLength(1);
    expect(deletes[0]!.args[0]).toEqual(["OPP-DIGI-0"]);
  });

  it("plays 2 [Petrification] Tokens", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, opponentDigimon: 1, opponentTrash: 2 });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const tokens = recorder.calls.filter((c) => c.verb === "playToken");
    expect(tokens).toHaveLength(2);
    for (const t of tokens) expect(t.args[1]).toBe("Petrification Token");
  });

  it(// Q5594 (2026-02-06): the [Petrification] Tokens are played as the OPPONENT's
  // Digimon. The hand-written override calls playToken with the opponent's seat.
  "plays the [Petrification] Tokens on the OPPONENT's side (Q5594)", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, opponentDigimon: 1, opponentTrash: 2 });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const tokens = recorder.calls.filter((c) => c.verb === "playToken");
    expect(tokens.length).toBeGreaterThan(0);
    // Opponent of the owner (seat 0) is seat 1.
    for (const t of tokens) expect(t.args[0]).toBe(1);
  });

  it(// Card text: "+2000 DP for each of your opponent's Digimon until their turn ends."
  // The override scales the DP gain by the live opponent-Digimon count. With 3 opponent
  // Digimon the gain is 6000.
  "scales the DP gain by the opponent's Digimon count (+2000 each)", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, opponentDigimon: 3, opponentTrash: 2 });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const dp = recorder.calls.filter((c) => c.verb === "modifyDP" && c.args[0] === SELF_PERMANENT);
    expect(dp).toHaveLength(1);
    expect(dp[0]!.args[1]).toBe(2000 * 3);
  });

  it(// Q5591/Q5592 (2025-12-25): the tokens are gated behind a "by" cost — returning
  // exactly 2 cards from the opponent's trash to the BOTTOM of the deck. The override
  // returns 2 opponent-trash cards to the deck bottom before playing the tokens.
  "returns 2 cards from the opponent's trash to the deck bottom as the [by] cost", async () => {
    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ recorder, opponentDigimon: 1, opponentTrash: 2 });
    const effect = module!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource())[0]!;
    await effect.resolve(ctx);
    const toDeck = recorder.calls.filter((c) => c.verb === "returnToDeck");
    expect(toDeck).toHaveLength(1);
    expect((toDeck[0]!.args[0] as string[]).length).toBe(2);
    const opts = toDeck[0]!.args[1] as { toTop?: boolean } | undefined;
    expect(opts?.toTop).toBeFalsy();
  });
});
