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
import "./EX4-060.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

const card = (id: string, seat: Seat): CardInstance =>
  ({ cardId: id, instanceId: `${id}-${seat}`, ownerSeat: seat, faceUp: true }) as CardInstance;
const def = (id: string, level: number): CardDefinition => ({
  cardId: id,
  set: "TEST",
  nameEn: id,
  kinds: [CardKind.Digimon],
  colors: ["White"] as never,
  playCost: 5,
  dp: 1000,
  level,
  evoCosts: [],
  maxCountInDeck: 4,
});

describe("EX4-060 Omnimon Alter-S", () => {
  it("registers full residual-free IR with the non-owner-effect leave gate", () => {
    expect(runtimeCompiledCard("EX4-060")).toMatchObject({ coverage: "full", residual: [] });
    expect(runtimeCompiledCard("EX4-060")?.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 6 },
          { color: "Red", level: 6 },
        ],
      },
    ]);
    expect(runtimeCompiledCard("EX4-060")?.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
    });
    const replacement = runtimeCompiledCard("EX4-060")?.effects?.[1]?.actions?.[0];
    expect(replacement?.kind).toBe("Replacement");
    if (replacement?.kind !== "Replacement") throw new Error("expected leave-play replacement");
    expect(replacement.actions).toEqual([
      expect.objectContaining({ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true }),
      expect.objectContaining({ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true }),
      expect.objectContaining({ kind: "SecurityManipulation" }),
    ]);
  });

  it("deletes an opposing Digimon at 8000 DP or less and returns a level six opponent to deck bottom", async () => {
    const self = {
      permanentId: "self",
      controllerSeat: 0,
      topCard: card("EX4-060", 0),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
      currentDP: 15000,
    } as unknown as Permanent;
    const low = {
      permanentId: "low",
      controllerSeat: 1,
      topCard: card("LOW", 1),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
      currentDP: 7000,
    } as unknown as Permanent;
    const high = {
      permanentId: "high",
      controllerSeat: 1,
      topCard: card("HIGH", 1),
      stack: [],
      linked: [],
      isSuspended: false,
      inBreeding: false,
      currentDP: 12000,
    } as unknown as Permanent;
    const players = [
      { battleArea: [self], security: [], hand: [], deck: [], trash: [] },
      { battleArea: [low, high], security: [], hand: [], deck: [], trash: [] },
    ];
    const defs = new Map([
      ["EX4-060", def("EX4-060", 7)],
      ["LOW", def("LOW", 5)],
      ["HIGH", def("HIGH", 6)],
    ]);
    const deleted: unknown[] = [];
    const returned: unknown[] = [];
    const game: GameAccess = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => [self, low, high].find((p) => p.permanentId === id),
      definitionOf: (c: CardInstance) => defs.get(c.cardId)!,
    } as unknown as GameAccess;
    const fx = {
      deletePermanent: async (ids: string[]) => deleted.push(ids),
      returnToDeck: async (ids: string[], options: unknown) => returned.push([ids, options]),
    } as unknown as Primitives;
    const ask: DecisionApi = {
      optional: async () => true,
      chooseOption: async () => 0,
      chooseTargets: async (_ctx, options) => [options.candidates[0]!],
      selectCards: async () => [],
      selectPermanents: async () => [],
    };
    const source: CardSource = {
      instanceId: self.topCard!.instanceId,
      cardId: "EX4-060",
      ownerSeat: 0 as Seat,
      definition: defs.get("EX4-060")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const effect = getEffectModule("EX4-060")!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;
    await effect.resolve({ source, trigger: {}, game, fx, ask } as unknown as EffectContext);
    expect(deleted).toEqual([["low"]]);
    expect(returned).toEqual([[[high.topCard!.instanceId], { toTop: false }]]);
  });

  it("plays both named evolution cards when possible and places itself face-down in security", async () => {
    const self = {
      permanentId: "self",
      controllerSeat: 0,
      topCard: card("EX4-060", 0),
      stack: [card("BLITZ", 0), card("CRES", 0)],
      linked: [],
      isSuspended: false,
      inBreeding: false,
      currentDP: 15000,
    } as unknown as Permanent;
    const players = [
      { battleArea: [self], security: [], hand: [], deck: [], trash: [] },
      { battleArea: [], security: [], hand: [], deck: [], trash: [] },
    ];
    const defs = new Map([
      ["EX4-060", def("EX4-060", 7)],
      ["BLITZ", { ...def("BLITZ", 6), nameEn: "BlitzGreymon" }],
      ["CRES", { ...def("CRES", 6), nameEn: "CresGarurumon" }],
    ]);
    const replacements: unknown[] = [];
    const game: GameAccess = {
      state: { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => (id === "self" ? self : undefined),
      definitionOf: (c: CardInstance) => defs.get(c.cardId)!,
    } as unknown as GameAccess;
    const source: CardSource = {
      instanceId: self.topCard!.instanceId,
      cardId: "EX4-060",
      ownerSeat: 0 as Seat,
      definition: defs.get("EX4-060")!,
      permanent: () => self,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    };
    const effect = getEffectModule("EX4-060")!.effectsForTiming(EffectTiming.None, source)[0]!;
    await effect.resolve({
      source,
      trigger: {},
      game,
      fx: {
        subscribeReplacement: (replacement: unknown) => replacements.push(replacement),
      } as unknown as Primitives,
      ask: {
        chooseOption: async () => 0,
        chooseTargets: async () => [],
        selectCards: async (_ctx: EffectContext, options: { candidates: string[] }) => [options.candidates[0]!],
        selectPermanents: async () => [],
        optional: async () => true,
      },
    } as unknown as EffectContext);
    expect(replacements).toHaveLength(1);
    expect(replacements[0]).toMatchObject({ event: "wouldLeavePlay", mode: "instead" });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-060");
    expect(s.state.players[0]!.hand.some((handCard) => handCard.instanceId === s.inst("subject").instanceId)).toBe(
      false,
    );
  });

  it("DNA digivolves from blue and red level-six Digimon for zero memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-044", as: "blue" },
          { card: "BT1-025", as: "red" },
        ],
        hand: [{ card: "EX4-060", as: "alterS" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("blue").permanentId, s.perm("red").permanentId],
        instanceId: s.inst("alterS").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX4-060"));
    expect(s.state.players[0]!.battleArea.filter((perm) => perm.topCard?.cardId === "EX4-060")).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("uses the public opponent attack path to replace leaving play with Blitz, Cres, and face-down security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-060", as: "subject", dp: 7000, suspended: true, under: ["EX4-051", "EX4-049"] }],
          security: ["BT1-001", "BT1-002"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 12000 }], security: ["BT1-001", "BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("subject").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX4-051") &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX4-049"),
    );
    expect(s.state.players[0]!.battleArea.filter((perm) => perm.topCard?.cardId === "EX4-051")).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.filter((perm) => perm.topCard?.cardId === "EX4-049")).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(
      s.state.players[0]!.security.some(
        (securityCard) => securityCard.instanceId === s.inst("subject").instanceId && securityCard.faceUp === false,
      ),
    ).toBe(true);
  });
  ex4CardBehaviorTests("EX4-060");
});
