import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type GameState, type Seat, type Permanent } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT24-085.js";

// A3 for BT24-085 (Dan Yuki & Kanan Yuki) — its [End of Your Turn] clause: "By suspending
// this Tamer, you may use 1 [TS] trait Option card with as high or lower a use cost as
// your opponent's memory from your hand without paying the cost. Then, 1 of your Digimon
// with the [TS] trait may attack."
//
// FAILS-WHEN-REVERTED: the pre-fix module's OnEndTurn resolve body was an empty comment
// (`{ /* Complex; requires option-use interface */ }`) — a documented no-op. Neither the
// suspend cost, the free Option use, nor the trailing attack ever happened.

const CARD_ID = "BT24-085";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? CARD_ID,
    set: "BT24",
    nameEn: over.nameEn ?? "Dan Yuki & Kanan Yuki",
    kinds: (over.kinds as never) ?? (["Tamer"] as never),
    colors: (over.colors as never) ?? (["Green", "Red"] as never),
    types: (over.types as never) ?? ([] as never),
    playCost: over.playCost ?? 3,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

interface FxRecord {
  suspendCalls: string[][];
  useOptionCalls: [string, number | undefined][];
  forceAttackCalls: string[];
}

function makeSelf(isSuspended: boolean): Permanent {
  return {
    permanentId: "perm-tamer",
    controllerSeat: 0 as Seat,
    isSuspended,
    inBreeding: false,
    topCard: { instanceId: "inst-tamer", cardId: CARD_ID, ownerSeat: 0, faceUp: true } as never,
  } as unknown as Permanent;
}

function makeSource(self: Permanent | undefined): CardSource {
  return {
    instanceId: "inst-tamer",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef(),
    permanent: () => self,
    isOnBattleArea: () => self !== undefined,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeContext(opts: {
  self: Permanent | undefined;
  hand: { instanceId: string; cardId: string }[];
  battleArea: { permanentId: string; topCard: { instanceId: string; cardId: string } }[];
  definitions: Record<string, Partial<CardDefinition>>;
  memory: number;
  record: FxRecord;
}): EffectContext {
  const { self, hand, battleArea, definitions, memory, record } = opts;

  const players = [
    { seat: 0 as Seat, battleArea, hand, trash: [], security: [], deck: [] },
    { seat: 1 as Seat, battleArea: [], hand: [], trash: [], security: [], deck: [] },
  ];
  const state = { memory, players, turnSeat: 0 as Seat } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: () => undefined,
    definitionOf: (card: { cardId: string }) => {
      const over = definitions[card.cardId] ?? {};
      return fakeDef({ cardId: card.cardId, ...over });
    },
  };

  const fx = {
    suspend: async (ids: string[]) => {
      record.suspendCalls.push([...ids]);
      return ids;
    },
    useOptionFromHand: async (_ctx: EffectContext, id: string, cost: number | undefined) => {
      record.useOptionCalls.push([id, cost]);
    },
    forceAttack: async (id: string) => {
      record.forceAttackCalls.push(id);
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max ?? 1),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max ?? 1),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max ?? 1),
    chooseOption: async () => 0,
  };

  return { source: makeSource(self), trigger: {}, game, fx, ask } as unknown as EffectContext;
}

describe("BT24-085 [End of Your Turn] suspend -> use 1 [TS] Option free -> 1 [TS] Digimon may attack", () => {
  it("registers the module", () => {
    expect(getEffectModule(CARD_ID)).toBeDefined();
  });

  it("suspends, uses the eligible [TS] Option for free, and attacks with a [TS] Digimon", async () => {
    const module = getEffectModule(CARD_ID)!;
    const self = makeSelf(false);
    const effects = module.effectsForTiming(EffectTiming.OnEndTurn, makeSource(self));
    expect(effects.length).toBe(1);

    const record: FxRecord = { suspendCalls: [], useOptionCalls: [], forceAttackCalls: [] };
    const ctx = makeContext({
      self,
      hand: [{ instanceId: "ts-option", cardId: "TS-OPT" }],
      battleArea: [{ permanentId: "ts-digimon-perm", topCard: { instanceId: "ts-digimon-inst", cardId: "TS-DIGI" } }],
      definitions: {
        "TS-OPT": { kinds: [CardKind.Option] as never, types: ["TS"] as never, playCost: 2 },
        "TS-DIGI": { kinds: [CardKind.Digimon] as never, types: ["TS"] as never, dp: 3000 },
      },
      // turnSeat (0) is the owner; state.memory is turn-relative, so the OPPONENT's (seat 1)
      // memory is -state.memory. -(-3) = 3, which covers the Option's playCost of 2.
      memory: -3,
      record,
    });

    await effects[0]!.resolve(ctx);

    expect(record.suspendCalls).toEqual([["perm-tamer"]]);
    expect(record.useOptionCalls).toEqual([["ts-option", 2]]);
    expect(record.forceAttackCalls).toEqual(["ts-digimon-perm"]);
  });

  it("does not pay the cost or attack when this Tamer is already suspended", async () => {
    const module = getEffectModule(CARD_ID)!;
    const self = makeSelf(true);
    const effects = module.effectsForTiming(EffectTiming.OnEndTurn, makeSource(self));

    const record: FxRecord = { suspendCalls: [], useOptionCalls: [], forceAttackCalls: [] };
    const ctx = makeContext({
      self,
      hand: [{ instanceId: "ts-option", cardId: "TS-OPT" }],
      battleArea: [{ permanentId: "ts-digimon-perm", topCard: { instanceId: "ts-digimon-inst", cardId: "TS-DIGI" } }],
      definitions: {
        "TS-OPT": { kinds: [CardKind.Option] as never, types: ["TS"] as never, playCost: 2 },
        "TS-DIGI": { kinds: [CardKind.Digimon] as never, types: ["TS"] as never, dp: 3000 },
      },
      memory: 0,
      record,
    });

    await effects[0]!.resolve(ctx);

    expect(record.suspendCalls).toEqual([]);
    expect(record.useOptionCalls).toEqual([]);
    expect(record.forceAttackCalls).toEqual([]);
  });

  it("skips the Option use when its cost exceeds the opponent's memory, but still offers the attack", async () => {
    const module = getEffectModule(CARD_ID)!;
    const self = makeSelf(false);
    const effects = module.effectsForTiming(EffectTiming.OnEndTurn, makeSource(self));

    const record: FxRecord = { suspendCalls: [], useOptionCalls: [], forceAttackCalls: [] };
    const ctx = makeContext({
      self,
      hand: [{ instanceId: "ts-option", cardId: "TS-OPT" }],
      battleArea: [{ permanentId: "ts-digimon-perm", topCard: { instanceId: "ts-digimon-inst", cardId: "TS-DIGI" } }],
      definitions: {
        "TS-OPT": { kinds: [CardKind.Option] as never, types: ["TS"] as never, playCost: 5 }, // too expensive
        "TS-DIGI": { kinds: [CardKind.Digimon] as never, types: ["TS"] as never, dp: 3000 },
      },
      memory: 0,
      record,
    });

    await effects[0]!.resolve(ctx);

    expect(record.suspendCalls).toEqual([["perm-tamer"]]);
    expect(record.useOptionCalls).toEqual([]);
    expect(record.forceAttackCalls).toEqual(["ts-digimon-perm"]);
  });
});
