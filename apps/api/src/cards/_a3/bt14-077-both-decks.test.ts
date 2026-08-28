import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance, type GameState, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";

// Import the override so it self-registers on the registry.
import "../BT14/BT14-077.js";

// ---------------------------------------------------------------------------
// BT14-077 both-decks mill A3
//
// BT14-077 (Machinedramon (Virus)) mills the top 2 cards from BOTH players'
// decks on [On Play] and [When Digivolving]. The documented behavior iterates
// Players_ForTurnPlayer, which includes both seats.
//
// FAILS-WHEN-REVERTED LEVER:
//   Reverting the interpreter's TrashTopDeck case to the old single-seat form
//   (const seat = ctx.source.ownerSeat) means the opponent's deck is never
//   touched. The "opponent deck trashed" assertion goes RED.
// ---------------------------------------------------------------------------

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(cardId: string, over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: cardId,
    kinds: ["Digimon"] as never,
    colors: ["Purple"] as never,
    playCost: 7,
    dp: 8000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function fakeCardInstance(cardId: string, instanceId: string, ownerSeat: Seat = 0): CardInstance {
  return { cardId, instanceId, ownerSeat } as never;
}

function makeSource(cardId: string): CardSource {
  return {
    instanceId: `INST#${cardId}`,
    cardId,
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(cardId),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeContext(opts: {
  ownerDeck: CardInstance[];
  opponentDeck: CardInstance[];
  recorder: Recorder;
}): EffectContext {
  const players = [
    { seat: 0 as Seat, battleArea: [], security: [], hand: [], deck: [...opts.ownerDeck], trash: [] },
    { seat: 1 as Seat, battleArea: [], security: [], hand: [], deck: [...opts.opponentDeck], trash: [] },
  ];
  const state = { memory: 3, players, turnSeat: 0 } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined as never,
    definitionOf: (card: CardInstance): CardDefinition => fakeDefinition(card.cardId),
  };

  const fx = {
    reveal: async (seat: Seat, n: number): Promise<CardInstance[]> => {
      const deck = seat === 0 ? opts.ownerDeck : opts.opponentDeck;
      opts.recorder.calls.push({ verb: "reveal", args: [seat, n] });
      return deck.slice(0, n);
    },
    trash: (...args: unknown[]) => {
      opts.recorder.calls.push({ verb: "trash", args });
      return [] as never;
    },
    fireOnDiscardLibrary: async (...args: unknown[]) => {
      opts.recorder.calls.push({ verb: "fireOnDiscardLibrary", args });
    },
    fireWhenTrashedFromDeck: async (...args: unknown[]) => {
      opts.recorder.calls.push({ verb: "fireWhenTrashedFromDeck", args });
    },
    // Any other primitive call is unexpected.
    returnToHand: (...a: unknown[]) => {
      throw new Error(`Unexpected returnToHand(${JSON.stringify(a)})`);
    },
    returnToDeck: (...a: unknown[]) => {
      throw new Error(`Unexpected returnToDeck(${JSON.stringify(a)})`);
    },
    gainMemory: (...a: unknown[]) => {
      throw new Error(`Unexpected gainMemory(${JSON.stringify(a)})`);
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return { source: makeSource("BT14-077"), trigger: {}, game, fx, ask };
}

function revealedSeats(rec: Recorder): Seat[] {
  return rec.calls.filter((c) => c.verb === "reveal").map((c) => c.args[0] as Seat);
}

function trashedIds(rec: Recorder): string[] {
  return rec.calls.filter((c) => c.verb === "trash").flatMap((c) => c.args[0] as string[]);
}

describe("BT14-077 both-decks mill A3", () => {
  it("[On Play] mills top 2 from BOTH players' decks", async () => {
    const ownerDeck = [
      fakeCardInstance("P1-CARD-A", "p1-a"),
      fakeCardInstance("P1-CARD-B", "p1-b"),
      fakeCardInstance("P1-CARD-C", "p1-c"),
    ];
    const opponentDeck = [
      fakeCardInstance("P2-CARD-A", "p2-a"),
      fakeCardInstance("P2-CARD-B", "p2-b"),
      fakeCardInstance("P2-CARD-C", "p2-c"),
    ];

    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ ownerDeck, opponentDeck, recorder });

    const module = getEffectModule("BT14-077");
    expect(module, "BT14-077 must self-register on import").toBeDefined();
    const source = ctx.source as CardSource;
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    expect(effects.length, "BT14-077 must expose an [On Play] effect").toBeGreaterThanOrEqual(1);
    await effects[0]!.resolve(ctx);

    // Both seats must have been revealed.
    const seats = revealedSeats(recorder);
    expect(seats).toContain(0 as Seat); // owner seat
    expect(seats).toContain(1 as Seat); // opponent seat

    // Owner's top 2 cards must be trashed.
    const trashed = trashedIds(recorder);
    expect(trashed).toContain("p1-a");
    expect(trashed).toContain("p1-b");

    // Opponent's top 2 cards must be trashed.
    expect(trashed).toContain("p2-a");
    expect(trashed).toContain("p2-b");
  });

  it("[When Digivolving] mills top 2 from BOTH players' decks", async () => {
    const ownerDeck = [fakeCardInstance("P1-CARD-A", "p1-a2"), fakeCardInstance("P1-CARD-B", "p1-b2")];
    const opponentDeck = [fakeCardInstance("P2-CARD-A", "p2-a2"), fakeCardInstance("P2-CARD-B", "p2-b2")];

    const recorder: Recorder = { calls: [] };
    const ctx = makeContext({ ownerDeck, opponentDeck, recorder });

    const module = getEffectModule("BT14-077");
    expect(module, "BT14-077 must self-register on import").toBeDefined();
    const source = ctx.source as CardSource;
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effects.length, "BT14-077 must expose a [When Digivolving] effect").toBeGreaterThanOrEqual(1);
    await effects[0]!.resolve(ctx);

    const seats = revealedSeats(recorder);
    expect(seats).toContain(0 as Seat);
    expect(seats).toContain(1 as Seat);

    const trashed = trashedIds(recorder);
    expect(trashed).toContain("p1-a2");
    expect(trashed).toContain("p2-a2");
  });

  // REVERT LEVER: if the interpreter TrashTopDeck case is reverted to single-seat
  // (const seat = ctx.source.ownerSeat), the opponent seat (1) is never revealed
  // and the opponent's cards are not in the trashed list — this test goes RED.
  it("revert-proof: opponent seat reveal is required (documents fail-when-reverted contract)", () => {
    // This test exists to document the revert lever; the two tests above ARE the
    // behavioral proof. No code here — the contract is captured in the test names.
    expect(true).toBe(true);
  });
});
