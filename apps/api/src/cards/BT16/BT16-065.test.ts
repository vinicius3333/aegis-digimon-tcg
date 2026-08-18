import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT16-065.js";

// BT16-065 (Darkdramon) A3 behavioral test.
//
// FAILS-WHEN-REVERTED: the declarative effect record had the delete-by-revealed-cost as RawUnparsed
// (no "compare to revealed card stat" primitive existed). This test exercises the full flow:
// reveal → pick Digimon → delete opponent Digimon with cost ≤ that.
// With the old IR, deletePermanent was NEVER called (the RawUnparsed action is a no-op).
// With the hand-written module, deletePermanent is called with the opponent Digimon's
// permanentId when its playCost is ≤ the selected revealed Digimon's playCost.

const cardId = "BT16-065";

function makeSource(): CardSource {
  const perm = {
    permanentId: "PERM#DARKDRAMON",
    topCard: { instanceId: "INST#DARKDRAMON", cardId, ownerSeat: 0 as Seat } as CardInstance,
    stack: [] as CardInstance[],
    currentDP: 13000,
    isSuspended: false,
    linked: [] as CardInstance[],
  } as unknown as Permanent;
  return {
    instanceId: "INST#DARKDRAMON",
    cardId,
    ownerSeat: 0 as Seat,
    definition: {
      cardId,
      kinds: ["Digimon"],
      colors: ["Black"],
      playCost: 14,
      dp: 13000,
      evoCosts: [],
      maxCountInDeck: 4,
    } as unknown as CardDefinition,
    permanent: () => perm,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeCard(id: string, cid: string, playCost: number, kinds = ["Digimon"]): CardInstance {
  return { instanceId: id, cardId: cid, ownerSeat: 0 as Seat, faceUp: true } as CardInstance;
}

function makeDefinition(cid: string, playCost: number, kinds: string[] = ["Digimon"]): CardDefinition {
  return {
    cardId: cid,
    kinds,
    colors: ["Black"],
    playCost,
    dp: 4000,
    evoCosts: [],
    maxCountInDeck: 4,
    nameEn: cid,
    types: [],
  } as unknown as CardDefinition;
}

function makePermanent(permId: string, cardId: string, playCost: number, controllerSeat: Seat = 1 as Seat): Permanent {
  return {
    permanentId: permId,
    topCard: { instanceId: `top-${permId}`, cardId, ownerSeat: controllerSeat, faceUp: true } as CardInstance,
    stack: [],
    baseDP: 4000,
    currentDP: 4000,
    isSuspended: false,
    linked: [],
    controllerSeat,
  } as unknown as Permanent;
}

function makeContext(opts: {
  revealedCards: CardInstance[];
  revealedDefinitions: Record<string, CardDefinition>;
  opponentDigimon: Permanent[];
  deleted: string[];
  trashed: string[];
  chosen?: string; // which revealed card the player picks; defaults to first Digimon
  chosenTarget?: string; // which opponent Digimon to delete; defaults to first
}): EffectContext {
  const source = makeSource();

  const p0 = { seat: 0 as Seat, battleArea: [] as Permanent[], security: [], hand: [], deck: [], trash: [] };
  const p1 = { seat: 1 as Seat, battleArea: opts.opponentDigimon, security: [], hand: [], deck: [], trash: [] };

  const definitionOf = (card: CardInstance): CardDefinition => {
    return (
      opts.revealedDefinitions[card.cardId] ??
      opts.revealedDefinitions[card.instanceId] ??
      makeDefinition(card.cardId, 0)
    );
  };

  const game: GameAccess = {
    state: {} as never,
    player: (seat: Seat) => (seat === 0 ? p0 : p1) as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => {
      return opts.opponentDigimon.find((p) => p.permanentId === id);
    },
    definitionOf,
  };

  const fx = {
    reveal: async (_seat: Seat, _n: number): Promise<CardInstance[]> => opts.revealedCards,
    selectCards: async () => [],
    chooseTargets: async () => [],
    trash: async (ids: string[]): Promise<CardInstance[]> => {
      opts.trashed.push(...ids);
      return [];
    },
    deletePermanent: async (ids: string[]): Promise<number> => {
      opts.deleted.push(...ids);
      return ids.length;
    },
    returnToDeck: async () => [],
    dnaDigivolveInto: async () => undefined,
    changePlayCost: () => {},
  } as unknown as Primitives;

  // The ask API: auto-selects the first matching candidate (or the provided choice).
  let selectCallIndex = 0;
  const ask: DecisionApi = {
    optional: async () => true,
    selectPermanents: async () => [], chooseTargets: async (_ctx, o) => {
      const pick = opts.chosenTarget !== undefined && o.candidates.includes(opts.chosenTarget)
        ? [opts.chosenTarget]
        : o.candidates.slice(0, Math.min(o.max, o.candidates.length));
      return pick;
    },
    selectCards: async (_ctx, o) => {
      selectCallIndex++;
      if (selectCallIndex === 1) {
        // First call: pick the Digimon card from the revealed set.
        const pick = opts.chosen !== undefined && o.candidates.includes(opts.chosen)
          ? opts.chosen
          : o.candidates[0];
        return pick !== undefined ? [pick] : [];
      }
      // Subsequent calls: pick first candidate.
      return o.candidates.slice(0, Math.min(o.max, o.candidates.length));
    },
    chooseOption: async () => 0,
  };

  return { source, trigger: {}, game, fx, ask };
}

describe("BT16-065 (Darkdramon) registration", () => {
  it("is registered after import", () => {
    const module = getEffectModule(cardId);
    expect(module).toBeDefined();
  });

  it("exposes an OnPlay effect", () => {
    const module = getEffectModule(cardId)!;
    const effects = module.effectsForTiming(EffectTiming.OnPlay, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });

  it("exposes a WhenDigivolving effect", () => {
    const module = getEffectModule(cardId)!;
    const effects = module.effectsForTiming(EffectTiming.WhenDigivolving, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });

  it("exposes a BeforePayCost effect", () => {
    const module = getEffectModule(cardId)!;
    const effects = module.effectsForTiming(EffectTiming.BeforePayCost, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });

  it("exposes an EndOfYourTurn effect", () => {
    const module = getEffectModule(cardId)!;
    const effects = module.effectsForTiming(EffectTiming.OnEndTurn, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });
});

describe("BT16-065 (Darkdramon) [On Play] reveal-and-delete (FAILS-WHEN-REVERTED)", () => {
  it("deletes an opponent Digimon whose playCost ≤ the revealed Digimon's playCost", async () => {
    const module = getEffectModule(cardId)!;

    // Set up: reveal [Agumon (cost 3), a Tamer, Gabumon (cost 3)].
    // Opponent has a Digimon with cost 3 (≤ 3) and one with cost 8 (> 3).
    const revealedAgumon = makeCard("rev-1", "BT1-007", 3);
    const revealedTamer = makeCard("rev-2", "BT1-061", 2);
    const revealedGabumon = makeCard("rev-3", "BT1-024", 3);

    const lowCostTarget = makePermanent("opp-low", "BT1-064", 3);
    const highCostTarget = makePermanent("opp-high", "BT1-085", 8);

    const deleted: string[] = [];
    const trashed: string[] = [];

    const ctx = makeContext({
      revealedCards: [revealedAgumon, revealedTamer, revealedGabumon],
      revealedDefinitions: {
        "BT1-007": makeDefinition("BT1-007", 3, ["Digimon"]),
        "BT1-061": makeDefinition("BT1-061", 2, ["Tamer"]),  // not a Digimon
        "BT1-024": makeDefinition("BT1-024", 3, ["Digimon"]),
        // Targets definitions (needed for opponentDigimon filter)
        "BT1-064": makeDefinition("BT1-064", 3, ["Digimon"]),
        "BT1-085": makeDefinition("BT1-085", 8, ["Digimon"]),
      },
      opponentDigimon: [lowCostTarget, highCostTarget],
      deleted,
      trashed,
      chosen: "rev-1", // pick Agumon (cost 3)
    });

    const effects = module.effectsForTiming(EffectTiming.OnPlay, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);

    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: with the old RawUnparsed IR, deletePermanent was never called.
    // With the hand-written module, it must be called with the low-cost target.
    expect(deleted).toContain(lowCostTarget.permanentId);
    // The high-cost Digimon (cost 8 > 3) must NOT be deleted.
    expect(deleted).not.toContain(highCostTarget.permanentId);
  });

  it("trashes the remaining revealed cards after the selection", async () => {
    const module = getEffectModule(cardId)!;

    const revealedAgumon = makeCard("rev-a", "BT1-007", 3);
    const revealedExtra1 = makeCard("rev-b", "BT1-008", 4);
    const revealedExtra2 = makeCard("rev-c", "BT1-009", 2);

    const lowTarget = makePermanent("opp-1", "BT1-064", 3);

    const deleted: string[] = [];
    const trashed: string[] = [];

    const ctx = makeContext({
      revealedCards: [revealedAgumon, revealedExtra1, revealedExtra2],
      revealedDefinitions: {
        "BT1-007": makeDefinition("BT1-007", 3, ["Digimon"]),
        "BT1-008": makeDefinition("BT1-008", 4, ["Digimon"]),
        "BT1-009": makeDefinition("BT1-009", 2, ["Digimon"]),
        "BT1-064": makeDefinition("BT1-064", 3, ["Digimon"]),
      },
      opponentDigimon: [lowTarget],
      deleted,
      trashed,
      chosen: "rev-a", // pick Agumon
    });

    const effects = module.effectsForTiming(EffectTiming.OnPlay, makeSource());
    await effects[0]!.resolve(ctx);

    // The 2 non-selected revealed cards must be trashed.
    expect(trashed).toContain("rev-b");
    expect(trashed).toContain("rev-c");
    // The selected card itself (rev-a / Agumon) must NOT be in trashed (it's taken).
    expect(trashed).not.toContain("rev-a");
  });

  it("does NOT delete when no opponent Digimon has cost ≤ threshold", async () => {
    const module = getEffectModule(cardId)!;

    const revealedAgumon = makeCard("rev-x", "BT1-007", 3);
    const highCostTarget = makePermanent("opp-high", "BT1-085", 8);

    const deleted: string[] = [];
    const trashed: string[] = [];

    const ctx = makeContext({
      revealedCards: [revealedAgumon],
      revealedDefinitions: {
        "BT1-007": makeDefinition("BT1-007", 3, ["Digimon"]),
        "BT1-085": makeDefinition("BT1-085", 8, ["Digimon"]),
      },
      opponentDigimon: [highCostTarget],
      deleted,
      trashed,
      chosen: "rev-x",
    });

    const effects = module.effectsForTiming(EffectTiming.OnPlay, makeSource());
    await effects[0]!.resolve(ctx);

    // No valid target → deletePermanent must not be called.
    expect(deleted).toHaveLength(0);
  });
});

describe("BT16-065 (Darkdramon) [When Digivolving] reveal-and-delete", () => {
  it("also deletes opponent Digimon via [When Digivolving] (same logic)", async () => {
    const module = getEffectModule(cardId)!;

    const revealedDigimon = makeCard("wd-rev-1", "BT1-007", 5);
    const target = makePermanent("opp-wd", "BT1-064", 4);

    const deleted: string[] = [];
    const trashed: string[] = [];

    const ctx = makeContext({
      revealedCards: [revealedDigimon],
      revealedDefinitions: {
        "BT1-007": makeDefinition("BT1-007", 5, ["Digimon"]),
        "BT1-064": makeDefinition("BT1-064", 4, ["Digimon"]),
      },
      opponentDigimon: [target],
      deleted,
      trashed,
    });

    const effects = module.effectsForTiming(EffectTiming.WhenDigivolving, makeSource());
    expect(effects.length).toBeGreaterThanOrEqual(1);
    await effects[0]!.resolve(ctx);

    expect(deleted).toContain(target.permanentId);
  });
});

describe("BT16-065 (Darkdramon) [BeforePayCost] Boss-trait cost reduction", () => {
  it("reduces playCostDelta by 6 when a [Boss] Digimon is on the field", async () => {
    const module = getEffectModule(cardId)!;
    const source = makeSource();

    const bossPerm = makePermanent("boss-perm", "BT16-036", 0, 1 as Seat);
    const bossCard: CardInstance = { instanceId: "boss-top", cardId: "BT16-036", ownerSeat: 1 as Seat, faceUp: true } as CardInstance;
    (bossPerm as unknown as Record<string, unknown>).topCard = bossCard;

    const p0 = { seat: 0 as Seat, battleArea: [] as Permanent[], security: [], hand: [], deck: [], trash: [] };
    const p1 = { seat: 1 as Seat, battleArea: [bossPerm] as Permanent[], security: [], hand: [], deck: [], trash: [] };

    const game: GameAccess = {
      state: {} as never,
      player: (seat: Seat) => (seat === 0 ? p0 : p1) as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      permanentById: () => undefined,
      definitionOf: (card: CardInstance) => ({
        cardId: card.cardId,
        kinds: ["Digimon"],
        colors: ["Black"],
        playCost: 0,
        dp: 8000,
        evoCosts: [],
        maxCountInDeck: 4,
        nameEn: card.cardId,
        types: ["Boss", "D-Brigade"],
      } as unknown as CardDefinition),
    };

    const ctx: EffectContext = {
      source,
      trigger: {},
      game,
      fx: { returnToDeck: async () => [] } as unknown as typeof ctx.fx,
      ask: {
        optional: async () => false, // decline the D-Brigade return
        chooseTargets: async () => [],
        selectPermanents: async () => [],
        selectCards: async () => [],
        chooseOption: async () => 0,
      },
      playCostDelta: 0,
    };

    const effects = module.effectsForTiming(EffectTiming.BeforePayCost, source);
    expect(effects.length).toBeGreaterThanOrEqual(1);
    await effects[0]!.resolve(ctx);

    expect(ctx.playCostDelta).toBe(6);
  });
});
