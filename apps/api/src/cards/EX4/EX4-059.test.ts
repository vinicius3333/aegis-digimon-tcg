import { describe, expect, it } from "vitest";
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
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import "./EX4-059.js";

const card = (cardId: string, seat: Seat): CardInstance =>
  ({ cardId, instanceId: `${cardId}-${seat}`, ownerSeat: seat, faceUp: true }) as CardInstance;

const def = (cardId: string): CardDefinition => ({
  cardId,
  set: "TEST",
  nameEn: cardId,
  kinds: [CardKind.Digimon],
  colors: [],
  playCost: 5,
  level: 5,
  dp: 5000,
  evoCosts: [],
  maxCountInDeck: 4,
});

describe("EX4-059 Cherubimon", () => {
  it("registers full residual-free IR with Alliance", () => {
    expect(getEffectModule("EX4-059")).toBeDefined();
    expect(runtimeCompiledCard("EX4-059")).toMatchObject({ coverage: "full", residual: [] });
    expect(runtimeCompiledCard("EX4-059")?.effects?.some((effect) => effect.keywords?.some((keyword) => keyword.keyword === "Alliance"))).toBe(true);
  });

  it("grants the optional On Deletion play effect to itself and one level-5-or-lower ally", async () => {
    const self = {
      permanentId: "self",
      topCard: card("EX4-059", 0),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const ally = {
      permanentId: "ally",
      topCard: card("ALLY", 0),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const players = [
      { battleArea: [self, ally], security: [], hand: [], deck: [], trash: [] },
      { battleArea: [], security: [], hand: [], deck: [], trash: [] },
    ];
    const defs = new Map([
      ["EX4-059", def("EX4-059")],
      ["ALLY", def("ALLY")],
    ]);
    const game: GameAccess = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => [self, ally].find((p) => p.permanentId === id),
      definitionOf: (c: CardInstance) => defs.get(c.cardId)!,
    } as unknown as GameAccess;
    const grants: unknown[] = [];
    const source: CardSource = {
      instanceId: self.topCard!.instanceId,
      cardId: "EX4-059",
      ownerSeat: 0 as Seat,
      definition: defs.get("EX4-059")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const effect = getEffectModule("EX4-059")!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve({
      source,
      trigger: {},
      game,
      fx: { subscribeSubTrigger: (args: unknown) => grants.push(args) } as unknown as Primitives,
      ask: {
        chooseOption: async () => 0,
        chooseTargets: async () => ["ally"],
        selectCards: async () => [],
        selectPermanents: async () => [],
        optional: async () => true,
      },
    } as unknown as EffectContext);
    expect(grants).toHaveLength(2);
    expect(grants[0]).toMatchObject({ sourcePermanentId: "self", event: "onDeletionOf" });
    expect(grants[1]).toMatchObject({ sourcePermanentId: "ally", event: "onDeletionOf" });
  });
});
