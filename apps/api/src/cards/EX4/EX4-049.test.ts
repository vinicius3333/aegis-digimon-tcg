import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import {
  CardKind,
  EffectTiming,
  type CardDefinition,
  type CardInstance,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { compiled } from "./EX4-049.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

function instance(cardId: string, ownerSeat: Seat): CardInstance {
  return { cardId, instanceId: `${cardId}-${ownerSeat}`, ownerSeat, faceUp: true } as CardInstance;
}

function definition(cardId: string, playCost: number): CardDefinition {
  return {
    cardId,
    set: "TEST",
    nameEn: cardId,
    kinds: [CardKind.Digimon],
    colors: ["Black"] as never,
    playCost,
    dp: 1000,
    level: 5,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

describe("EX4-049 CresGarurumon", () => {
  it("requires the exact WereGarurumon name for its alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toMatchObject([{ namesExact: ["WereGarurumon"], cost: 3 }]);
  });

  it("returns distinct selected opposing Digimon with combined play cost up to six to deck bottom", async () => {
    const selfCard = instance("EX4-049", 0);
    const self = {
      permanentId: "self",
      controllerSeat: 0,
      topCard: selfCard,
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const first = {
      permanentId: "first",
      controllerSeat: 1,
      topCard: instance("FIRST", 1),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const second = {
      permanentId: "second",
      controllerSeat: 1,
      topCard: instance("SECOND", 1),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const players = [
      { battleArea: [self], security: [], hand: [], deck: [], trash: [] },
      { battleArea: [first, second], security: [], hand: [], deck: [], trash: [] },
    ];
    const definitions = new Map<string, CardDefinition>([
      ["EX4-049", definition("EX4-049", 12)],
      ["FIRST", definition("FIRST", 3)],
      ["SECOND", definition("SECOND", 3)],
    ]);
    const returned: string[][] = [];
    const game: GameAccess = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => [self, first, second].find((permanent) => permanent.permanentId === id),
      definitionOf: (card: CardInstance) => definitions.get(card.cardId)!,
    } as unknown as GameAccess;
    const fx = {
      returnToDeck: async (ids: string[]) => {
        returned.push(ids);
        return ids;
      },
    } as unknown as Primitives;
    const ask: DecisionApi = {
      optional: async () => true,
      chooseOption: async () => 0,
      chooseTargets: async (_ctx, options) => options.candidates.slice(0, options.max),
      selectCards: async (_ctx, options) => options.candidates.slice(0, options.max),
      selectPermanents: async (_ctx, options) => options.candidates.slice(0, options.max),
    };
    const source: CardSource = {
      instanceId: selfCard.instanceId,
      cardId: "EX4-049",
      ownerSeat: 0 as Seat,
      definition: definitions.get("EX4-049")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
    const effect = getEffectModule("EX4-049")!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve(ctx);
    expect(returned).toEqual([[first.topCard!.instanceId, second.topCard!.instanceId]]);
  });

  it("digivolves another Digimon into a level-six-or-lower Greymon without paying", async () => {
    const selfCard = instance("EX4-049", 0);
    const self = {
      permanentId: "self",
      controllerSeat: 0,
      topCard: selfCard,
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const target = {
      permanentId: "target",
      controllerSeat: 0,
      topCard: instance("BASE", 0),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const handCard = instance("GREYMON", 0);
    const players = [
      { battleArea: [self, target], security: [], hand: [handCard], deck: [], trash: [] },
      { battleArea: [], security: [], hand: [], deck: [], trash: [] },
    ];
    const defs = new Map<string, CardDefinition>([
      ["EX4-049", definition("EX4-049", 12)],
      ["BASE", definition("BASE", 3)],
      ["GREYMON", { ...definition("GREYMON", 8), nameEn: "WarGreymon", level: 6 }],
    ]);
    const calls: unknown[][] = [];
    const game = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: () => 1 as Seat,
      permanentById: (id: string) => [self, target].find((p) => p.permanentId === id),
      definitionOf: (c: CardInstance) => defs.get(c.cardId)!,
    } as unknown as GameAccess;
    const source: CardSource = {
      instanceId: selfCard.instanceId,
      cardId: "EX4-049",
      ownerSeat: 0 as Seat,
      definition: defs.get("EX4-049")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const effect = getEffectModule("EX4-049")!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve({
      source,
      trigger: {},
      game,
      fx: { digivolveFromInstance: async (...args: unknown[]) => calls.push(args) } as unknown as Primitives,
      ask: {
        optional: async () => true,
        chooseOption: async () => 1,
        chooseTargets: async () => ["target"],
        selectCards: async () => [handCard.instanceId],
        selectPermanents: async () => [],
      },
    } as unknown as EffectContext);
    expect(calls[0]?.slice(0, 2)).toEqual(["target", handCard.instanceId]);
    expect(calls[0]?.[2]).toMatchObject({ payCost: false, ignoreRequirements: true });
  });

  it("only returns level-five-or-lower opposing Digimon for the inherited Omnimon effect", async () => {
    const self = {
      permanentId: "self",
      controllerSeat: 0,
      topCard: instance("OMNIMON", 0),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const low = {
      permanentId: "low",
      controllerSeat: 1,
      topCard: instance("LOW", 1),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const high = {
      permanentId: "high",
      controllerSeat: 1,
      topCard: instance("HIGH", 1),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const players = [
      { battleArea: [self], security: [], hand: [], deck: [], trash: [] },
      { battleArea: [low, high], security: [], hand: [], deck: [], trash: [] },
    ];
    const defs = new Map<string, CardDefinition>([
      ["OMNIMON", { ...definition("OMNIMON", 12), nameEn: "Omnimon Alter-S", level: 7 }],
      ["LOW", { ...definition("LOW", 5), nameEn: "WarGreymon", level: 5 }],
      ["HIGH", { ...definition("HIGH", 7), nameEn: "MetalGarurumon", level: 6 }],
    ]);
    const returned: string[][] = [];
    const game = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: () => 1 as Seat,
      permanentById: (id: string) => [self, low, high].find((p) => p.permanentId === id),
      definitionOf: (c: CardInstance) => defs.get(c.cardId)!,
    } as unknown as GameAccess;
    const source: CardSource = {
      instanceId: self.topCard!.instanceId,
      cardId: "EX4-049",
      ownerSeat: 0 as Seat,
      definition: defs.get("OMNIMON")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const effect = getEffectModule("EX4-049")!.effectsForTiming(EffectTiming.OnUseAttack, source)[0]!;
    await effect.resolve({
      source,
      trigger: {},
      game,
      fx: {
        returnToDeck: async (ids: string[]) => {
          returned.push(ids);
          return ids;
        },
      } as unknown as Primitives,
      ask: {
        optional: async () => true,
        chooseOption: async () => 0,
        chooseTargets: async () => ["low"],
        selectCards: async () => [],
        selectPermanents: async () => [],
      },
    } as unknown as EffectContext);
    expect(returned).toEqual([[low.topCard!.instanceId]]);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-049");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("publicly resolves modal mode two by digivolving another Digimon into Greymon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-049", as: "subject" },
            { card: "BT1-010", as: "target" },
          ],
          hand: [{ card: "BT1-015", as: "greymon" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [{ card: "BT1-009" }, { card: "BT1-013" }, { card: "BT1-015" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("subject"));
    await settle(() => s.perm("target").topCard?.cardId === "BT1-015");
    expect(s.perm("target").topCard?.cardId).toBe("BT1-015");
    expect(s.state.players[0]!.hand.some((entry) => entry.instanceId === s.inst("greymon").instanceId)).toBe(false);
  });

  it("publicly resolves modal mode three through DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-049", as: "subject" },
            { card: "EX4-051", as: "partner" },
            { card: "BT1-010", as: "target" },
          ],
          hand: [
            { card: "EX4-060", as: "omnimon" },
            { card: "BT1-015", as: "greymon" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [{ card: "BT1-009" }, { card: "BT1-013" }, { card: "BT1-015" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 2 },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("subject"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX4-060"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX4-060")).toBe(true);
    expect(s.state.players[0]!.hand.some((entry) => entry.instanceId === s.inst("omnimon").instanceId)).toBe(false);
  });

  ex4CardBehaviorTests("EX4-049");
});
