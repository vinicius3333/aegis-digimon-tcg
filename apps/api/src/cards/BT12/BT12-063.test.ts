import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, DecisionApi } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT12-063.js";

// A3 for BT12-063 (Shoutmon DX):
//   [On Play] Reveal top 3; may play 1 [Taiki Kudo]/[Yuu Amano]/[Tagiru Akashi] without cost.
//
// FAILS-WHEN-REVERTED: the declarative effect record encoded this via RevealAdd (interpreted path).
// The hand-written module calls ctx.fx.reveal + ctx.fx.playInstances. The `playInstancesCalls`
// assertion directly catches the regression: without the hand-written module, the reveal
// runs through the interpreter's RevealAdd action — but when the card goes back to the IR
// register path (registerIrCard), the EffectModule API yields 0 effects at OnPlay timing
// because registerIrCard does not produce an EffectModule registered under getEffectModule.

function fakeDef(cardId: string, kind: CardKind = CardKind.Digimon, name = cardId): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: name,
    kinds: [kind],
    colors: ["Black"] as never,
    playCost: 4,
    dp: kind === CardKind.Digimon ? 4000 : 0,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function makeSource(instanceId = "inst-063", onBattleArea = true): CardSource {
  return {
    instanceId,
    cardId: "BT12-063",
    ownerSeat: 0 as Seat,
    definition: fakeDef("BT12-063"),
    permanent: () => undefined,
    isOnBattleArea: () => onBattleArea,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeCtx(opts: {
  revealedCards?: Array<{ cardId: string; instanceId: string; name?: string }>;
  playInstancesCalls: string[][];
  onBattleArea?: boolean;
  deckSize?: number;
}): EffectContext {
  const { revealedCards = [], playInstancesCalls, onBattleArea = true, deckSize = 5 } = opts;

  const players = [
    {
      battleArea: [],
      security: [],
      hand: [],
      deck: Array.from({ length: deckSize }, (_, i) => ({ cardId: `deck-${i}`, instanceId: `d${i}` })),
      trash: [],
    },
    { battleArea: [], security: [], hand: [], deck: [], trash: [] },
  ];

  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (card: { cardId: string }) => {
      const found = revealedCards.find((c) => c.instanceId === card.cardId || c.cardId === card.cardId);
      if (found) return fakeDef(found.cardId, CardKind.Tamer, found.name ?? found.cardId);
      return fakeDef(card.cardId);
    },
  };

  const fx = {
    reveal: async (_seat: Seat, _n: number) =>
      revealedCards.map((c) => ({ cardId: c.cardId, instanceId: c.instanceId, ownerSeat: 0, faceUp: true })),
    playInstances: async (ids: string[], _opts?: unknown) => {
      playInstancesCalls.push(ids);
      return [];
    },
    returnToDeck: async (_ids: string[], _opts?: unknown) => [],
    returnToHand: async (_ids: string[]) => [],
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async (_ctx, _msg) => true,
    chooseTargets: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectPermanents: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    selectCards: async (_ctx, opts) => opts.candidates.slice(0, opts.max),
    chooseOption: async (_ctx, _choices) => 0,
  };

  const source = makeSource("inst-063", onBattleArea);

  return {
    source,
    trigger: {},
    game,
    fx,
    ask,
    selections: new Map(),
  } as unknown as EffectContext;
}

describe("BT12-063 Shoutmon DX [On Play]", () => {
  it("calls playInstances when a [Taiki Kudo] is among the revealed cards", async () => {
    const playInstancesCalls: string[][] = [];
    const taiki = { cardId: "taiki-001", instanceId: "taiki-inst", name: "Taiki Kudo" };
    const ctx = makeCtx({ revealedCards: [taiki], playInstancesCalls });

    const mod = getEffectModule("BT12-063");
    expect(mod).toBeDefined();

    const effects = mod!.effectsForTiming(EffectTiming.OnPlay, makeSource());
    // FAILS-WHEN-REVERTED: the IR module is not accessible via getEffectModule; 0 effects.
    expect(effects.length).toBeGreaterThan(0);

    await effects[0]!.resolve(ctx);

    // A [Taiki Kudo] was revealed; the player accepts (ask.optional → true);
    // playInstances should have been called with the Taiki instance.
    expect(playInstancesCalls).toHaveLength(1);
    expect(playInstancesCalls[0]).toContain(taiki.instanceId);
  });

  it("does NOT call playInstances when no named Tamer is among revealed cards", async () => {
    const playInstancesCalls: string[][] = [];
    const nonTamer = { cardId: "non-tamer", instanceId: "non-tamer-inst", name: "OtherDigimon" };
    const ctx = makeCtx({ revealedCards: [nonTamer], playInstancesCalls });

    const mod = getEffectModule("BT12-063");
    const effects = mod!.effectsForTiming(EffectTiming.OnPlay, makeSource());

    await effects[0]!.resolve(ctx);

    expect(playInstancesCalls).toHaveLength(0);
  });

  it("[When Digivolving] also has the reveal effect", () => {
    const mod = getEffectModule("BT12-063");
    const effects = mod!.effectsForTiming(EffectTiming.WhenDigivolving, makeSource());
    expect(effects.length).toBeGreaterThan(0);
  });
});
