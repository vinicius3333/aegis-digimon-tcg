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
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./EX4-069.js";

const card = (id: string, seat: Seat): CardInstance =>
  ({ cardId: id, instanceId: `${id}-${seat}`, ownerSeat: seat, faceUp: true }) as CardInstance;
const definition = (id: string, cost: number): CardDefinition => ({
  cardId: id,
  set: "TEST",
  nameEn: id,
  kinds: [CardKind.Digimon],
  colors: ["Black"] as never,
  playCost: cost,
  dp: 1000,
  level: 5,
  evoCosts: [],
  maxCountInDeck: 4,
});

describe("EX4-069 Gaia Reactor", () => {
  it("is represented by full residual-free IR", () => {
    expect(runtimeCompiledCard("EX4-069")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("deletes every Digimon except one highest-play-cost Digimon per player", async () => {
    const self = {
      permanentId: "self",
      controllerSeat: 0,
      topCard: card("EX4-069", 0),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const ownHigh = {
      permanentId: "ownHigh",
      controllerSeat: 0,
      topCard: card("OWN-HIGH", 0),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const ownLow = {
      permanentId: "ownLow",
      controllerSeat: 0,
      topCard: card("OWN-LOW", 0),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const oppHigh = {
      permanentId: "oppHigh",
      controllerSeat: 1,
      topCard: card("OPP-HIGH", 1),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const oppLow = {
      permanentId: "oppLow",
      controllerSeat: 1,
      topCard: card("OPP-LOW", 1),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const players = [
      { battleArea: [self, ownHigh, ownLow], security: [], hand: [], deck: [], trash: [] },
      { battleArea: [oppHigh, oppLow], security: [], hand: [], deck: [], trash: [] },
    ];
    const defs = new Map([
      ["EX4-069", { ...definition("EX4-069", 10), kinds: [CardKind.Option] }],
      ["OWN-HIGH", definition("OWN-HIGH", 7)],
      ["OWN-LOW", definition("OWN-LOW", 3)],
      ["OPP-HIGH", definition("OPP-HIGH", 6)],
      ["OPP-LOW", definition("OPP-LOW", 2)],
    ]);
    const deleted: string[][] = [];
    const game: GameAccess = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => [self, ownHigh, ownLow, oppHigh, oppLow].find((p) => p.permanentId === id),
      definitionOf: (c: CardInstance) => defs.get(c.cardId)!,
    } as unknown as GameAccess;
    const fx = { deletePermanent: async (ids: string[]) => deleted.push(ids) } as unknown as Primitives;
    const ask: DecisionApi = {
      optional: async () => true,
      chooseOption: async () => 0,
      chooseTargets: async (_ctx, options) => [options.candidates[0]!],
      selectCards: async () => [],
      selectPermanents: async () => [],
    };
    const source: CardSource = {
      instanceId: self.topCard!.instanceId,
      cardId: "EX4-069",
      ownerSeat: 0 as Seat,
      definition: defs.get("EX4-069")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const effect = getEffectModule("EX4-069")!.effectsForTiming(EffectTiming.OnUseOption, source)[0]!;
    await effect.resolve({ source, trigger: {}, game, fx, ask } as unknown as EffectContext);
    expect(deleted).toEqual([["ownLow"], ["oppLow"]]);
  });

  it("runs the same deletion effect when revealed in security", async () => {
    const self = {
      permanentId: "self",
      controllerSeat: 0,
      topCard: card("EX4-069", 0),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const survivor = {
      permanentId: "survivor",
      controllerSeat: 0,
      topCard: card("SURVIVOR", 0),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const victim = {
      permanentId: "victim",
      controllerSeat: 0,
      topCard: card("VICTIM", 0),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
    } as unknown as Permanent;
    const players = [
      { battleArea: [self, survivor, victim], security: [], hand: [], deck: [], trash: [] },
      { battleArea: [], security: [], hand: [], deck: [], trash: [] },
    ];
    const defs = new Map([
      ["EX4-069", { ...definition("EX4-069", 10), kinds: [CardKind.Option] }],
      ["SURVIVOR", definition("SURVIVOR", 7)],
      ["VICTIM", definition("VICTIM", 3)],
    ]);
    const deleted: string[][] = [];
    const game: GameAccess = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: () => 1 as Seat,
      permanentById: (id: string) => [self, survivor, victim].find((p) => p.permanentId === id),
      definitionOf: (c: CardInstance) => defs.get(c.cardId)!,
    } as unknown as GameAccess;
    const source: CardSource = {
      instanceId: self.topCard!.instanceId,
      cardId: "EX4-069",
      ownerSeat: 0 as Seat,
      definition: defs.get("EX4-069")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const effect = getEffectModule("EX4-069")!.effectsForTiming(EffectTiming.SecuritySkill, source)[0]!;
    await effect.resolve({
      source,
      trigger: {},
      game,
      fx: { deletePermanent: async (ids: string[]) => deleted.push(ids) } as unknown as Primitives,
      ask: {
        optional: async () => true,
        chooseOption: async () => 0,
        chooseTargets: async (_ctx: unknown, options: { candidates: string[] }) => [options.candidates[0]!],
        selectCards: async () => [],
        selectPermanents: async () => [],
      },
    } as unknown as EffectContext);
    expect(deleted).toEqual([["victim"]]);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-069");
    expect(s.state.players[0]!.hand.some((handCard) => handCard.instanceId === s.inst("subject").instanceId)).toBe(
      false,
    );
  });
  ex4CardBehaviorTests("EX4-069");
});
