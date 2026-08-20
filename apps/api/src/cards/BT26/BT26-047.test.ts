import { describe, it, expect, vi } from "vitest";
import { EffectDuration, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-047.js";
import "../index.js";

// A3 for BT26-047 (TyrantKabuterimon, BT26): "[On Play] [When Digivolving] This Digimon
// may battle 1 of your opponent's Digimon."
//
// FAILS-WHEN-REVERTED: skipping the `ctx.ask.optional` gate (or the forceBattle call)
// either battles unconditionally or never calls the battle primitive at all; this test
// asserts forceBattle fires with the chosen opponent target only after accepting.

const CARD_ID = "BT26-047";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "AD1-001",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? ([] as never),
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 0,
    types: over.types ?? [],
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "tyrantkabuterimon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "self-perm" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-047 [On Play]/[When Digivolving]: may battle 1 opponent Digimon", () => {
  it("calls forceBattle against the chosen opponent target only when the player accepts", async () => {
    const oppDigimon = { permanentId: "opp-perm", topCard: { cardId: "AD1-001" }, inBreeding: false };
    const players = [
      { seat: 0 as Seat, battleArea: [] },
      { seat: 1 as Seat, battleArea: [oppDigimon] },
    ];

    const game: GameAccess = {
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      definitionOf: () => fakeDef({ kinds: ["Digimon"] as never }),
    } as unknown as GameAccess;

    const battles: [string, string][] = [];
    const fx = {
      forceBattle: vi.fn<(...args: any[]) => any>(async (attackerId: string, defenderId: string) => {
        battles.push([attackerId, defenderId]);
      }),
    } as unknown as Primitives;

    const ask = {
      optional: vi.fn<(...args: any[]) => any>(async () => true),
      chooseTargets: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => [
        opts.candidates[0]!,
      ]),
    } as unknown as EffectContext["ask"];

    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;

    const module = getEffectModule(CARD_ID);
    expect(module).toBeDefined();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    const battleEffect = effects.find((e) => e.effectKey === `${CARD_ID}/on-play-may-battle`);
    expect(battleEffect).toBeDefined();

    await battleEffect!.resolve(ctx);

    expect(battles).toEqual([["self-perm", "opp-perm"]]);
  });

  it("does not battle when the player declines", async () => {
    const oppDigimon = { permanentId: "opp-perm", topCard: { cardId: "AD1-001" }, inBreeding: false };
    const players = [
      { seat: 0 as Seat, battleArea: [] },
      { seat: 1 as Seat, battleArea: [oppDigimon] },
    ];

    const game: GameAccess = {
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      definitionOf: () => fakeDef({ kinds: ["Digimon"] as never }),
    } as unknown as GameAccess;

    const battles: unknown[] = [];
    const fx = { forceBattle: vi.fn<(...args: any[]) => any>(async () => battles.push(1)) } as unknown as Primitives;
    const ask = { optional: vi.fn<(...args: any[]) => any>(async () => false) } as unknown as EffectContext["ask"];

    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
    const module = getEffectModule(CARD_ID);
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    const battleEffect = effects.find((e) => e.effectKey === `${CARD_ID}/on-play-may-battle`);

    await battleEffect!.resolve(ctx);

    expect(battles).toEqual([]);
  });
});

describe("BT26-047 suspend-cost clause", () => {
  it("allows the opponent's Digimon to pay the suspend cost (Q7042)", async () => {
    const own = { permanentId: "own-perm", topCard: { cardId: "OWN" }, inBreeding: false, isSuspended: true };
    const opponent = {
      permanentId: "opp-perm",
      topCard: { cardId: "OPP" },
      inBreeding: false,
      isSuspended: false,
    };
    const players = [
      { seat: 0 as Seat, battleArea: [own] },
      { seat: 1 as Seat, battleArea: [opponent] },
    ];
    const game: GameAccess = {
      state: { players } as never,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => [own, opponent].find((p) => p.permanentId === id) as never,
      definitionOf: (card: { cardId: string }) =>
        fakeDef({ cardId: card.cardId, types: card.cardId === "OPP" ? ["Insectoid"] : [] }),
    } as unknown as GameAccess;
    const suspended: string[][] = [];
    const fx = {
      suspend: vi.fn<(...args: any[]) => any>(async (ids: string[]) => {
        suspended.push(ids);
        opponent.isSuspended = true;
        return ids;
      }),
      restrict: vi.fn<(...args: any[]) => any>(),
      modifyDP: vi.fn<(...args: any[]) => any>(),
    } as unknown as Primitives;
    const ask = {
      optional: vi.fn<(...args: any[]) => any>(async () => true),
      chooseTargets: vi.fn<(...args: any[]) => any>(async () => [opponent.permanentId]),
    } as unknown as EffectContext["ask"];
    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!
      .effectsForTiming(EffectTiming.OnPlay, source)
      .find((candidate) => candidate.effectKey.endsWith("on-play-suspend-buff"))!;

    await effect.resolve(ctx);

    expect(suspended).toEqual([[opponent.permanentId]]);
  });

  it("grants the snapshot buff only after suspension succeeds and scopes immunity to opposing Options", async () => {
    const own = {
      permanentId: "own-insect",
      topCard: { cardId: "OWN" },
      controllerSeat: 0 as Seat,
      inBreeding: false,
      isSuspended: true,
    };
    const cost = {
      permanentId: "opp-cost",
      topCard: { cardId: "OPP" },
      controllerSeat: 1 as Seat,
      inBreeding: false,
      isSuspended: false,
    };
    const players = [
      { seat: 0 as Seat, battleArea: [own] },
      { seat: 1 as Seat, battleArea: [cost] },
    ];
    const game = {
      state: { players },
      player: (seat: Seat) => players[seat],
      permanentById: (id: string) => [own, cost].find((permanent) => permanent.permanentId === id),
      definitionOf: (card: { cardId: string }) =>
        fakeDef({ cardId: card.cardId, types: card.cardId === "OWN" ? ["Insectoid"] : [] }),
    } as unknown as GameAccess;
    const restrict = vi.fn();
    const modifyDP = vi.fn();
    const source = makeSource();
    const effect = getEffectModule(CARD_ID)!
      .effectsForTiming(EffectTiming.OnStartMainPhase, source)
      .find((candidate) => candidate.effectKey.endsWith("start-main-suspend-buff"))!;

    await effect.resolve({
      source,
      game,
      ask: { optional: async () => true, chooseTargets: async () => [cost.permanentId] },
      fx: {
        suspend: async (ids: string[]) => {
          cost.isSuspended = true;
          return ids;
        },
        restrict,
        modifyDP,
      },
    } as unknown as EffectContext);

    expect(restrict).toHaveBeenCalledWith("own-insect", "beAffected", EffectDuration.UntilOpponentTurnEnd, {
      fromSourceKind: ["Option"],
      byOpponentEffectsOnly: true,
    });
    expect(modifyDP).toHaveBeenCalledWith("own-insect", 3000, EffectDuration.UntilOpponentTurnEnd);
  });

  it("grants no immunity or DP when the selected suspension cost fails", async () => {
    const cost = { permanentId: "cost", topCard: { cardId: "COST" }, inBreeding: false, isSuspended: false };
    const players = [
      { seat: 0 as Seat, battleArea: [] },
      { seat: 1 as Seat, battleArea: [cost] },
    ];
    const source = makeSource();
    const restrict = vi.fn();
    const modifyDP = vi.fn();
    const effect = getEffectModule(CARD_ID)!
      .effectsForTiming(EffectTiming.OnStartMainPhase, source)
      .find((candidate) => candidate.effectKey.endsWith("start-main-suspend-buff"))!;

    await effect.resolve({
      source,
      game: {
        state: { players },
        player: (seat: Seat) => players[seat],
        permanentById: () => cost,
        definitionOf: () => fakeDef(),
      },
      ask: { optional: async () => true },
      fx: { suspend: async () => [], restrict, modifyDP },
    } as unknown as EffectContext);

    expect(restrict).not.toHaveBeenCalled();
    expect(modifyDP).not.toHaveBeenCalled();
  });

  it("triggers at start of main only while this Digimon is in battle on its owner's turn", () => {
    const ownTurn = makeSource();
    const opponentTurn = { ...makeSource(), isOwnersTurn: () => false } as CardSource;
    const offField = { ...makeSource(), isOnBattleArea: () => false } as CardSource;
    const effectFor = (source: CardSource) =>
      getEffectModule(CARD_ID)!
        .effectsForTiming(EffectTiming.OnStartMainPhase, source)
        .find((candidate) => candidate.effectKey.endsWith("start-main-suspend-buff"))!;

    expect(effectFor(ownTurn).canTrigger({ source: ownTurn } as EffectContext)).toBe(true);
    expect(effectFor(opponentTurn).canTrigger({ source: opponentTurn } as EffectContext)).toBe(false);
    expect(effectFor(offField).canTrigger({ source: offField } as EffectContext)).toBe(false);
  });
});

describe("BT26-047 public engine behavior", () => {
  it("uses the Lv.5 [TS] alternate evolution path on a non-green Digimon for cost 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-083", as: "purpleTsBase" }],
          hand: [{ card: CARD_ID, as: "tyrant" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purpleTsBase").permanentId,
        instanceId: s.inst("tyrant").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("purpleTsBase").topCard.instanceId === s.inst("tyrant").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("purpleTsBase").stack.map((card) => card.cardId)).toEqual(["BT25-083"]);
  });

  it("assembles from 4 matching Digimon of different levels, reduces cost by 6, and preserves declared stack order", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "tyrant" }],
          trash: [
            { card: "ST4-05", as: "level3" },
            { card: "ST4-07", as: "level4" },
            { card: "ST4-09", as: "level5" },
            { card: "ST4-13", as: "level6" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 7;
    const materials = ["level3", "level4", "level5", "level6"].map((alias) => s.inst(alias).instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tyrant").instanceId,
        assembly: { materialInstanceIds: materials },
      } as never),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === CARD_ID)?.stack.length === 4,
    );

    const tyrant = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === CARD_ID)!;
    expect(s.state.memory).toBe(0);
    // Stack arrays are bottom-first, so the first declared material is closest to TyrantKabuterimon.
    expect(tyrant.stack.map((card) => card.instanceId)).toEqual([...materials].reverse());
    expect(tyrant.stack.every((card) => card.faceUp)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("rejects Assembly when otherwise matching materials repeat a level without moving cards or paying memory", () => {
    const s = setupEngine({
      0: {
        hand: [{ card: CARD_ID, as: "tyrant" }],
        trash: [
          { card: "ST4-05", as: "level3a" },
          { card: "BT1-066", as: "level3b" },
          { card: "ST4-07", as: "level4" },
          { card: "ST4-09", as: "level5" },
        ],
      },
    });
    s.state.memory = 7;
    const materials = ["level3a", "level3b", "level4", "level5"].map((alias) => s.inst(alias).instanceId);

    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("tyrant").instanceId,
      assembly: { materialInstanceIds: materials },
    } as never);

    expect(result.ok).toBe(false);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(materials);
  });

  it("immediately battles and deletes a weaker opponent even when that defender is effect-immune (Q7040-Q7041)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "tyrant" }] },
        1: { battleArea: [{ card: "BT1-009", as: "defender", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const defenderId = s.perm("defender").permanentId;
    advance(s.engine).ledgers.continuous.addRestriction(defenderId, "beAffected", EffectDuration.Permanent);

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("tyrant"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    const ordering = s.decisions.find((decision) => decision.req.kind === "orderTriggers");
    const triggerKeys = ordering?.req.options?.triggerKeys ?? [];
    expect(triggerKeys.some((key) => key.endsWith(`${CARD_ID}/on-play-may-battle`))).toBe(true);
    expect(triggerKeys.some((key) => key.endsWith(`${CARD_ID}/on-play-suspend-buff`))).toBe(true);
  });

  it("may suspend the opponent's Digimon as cost and buffs only the owner's already-suspended Insectoid/Titan snapshot", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tyrant" },
            { card: "ST4-07", as: "ownInsect", dp: 4000, suspended: true },
            { card: "BT1-009", as: "ownPlain", dp: 3000, suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", as: "opponentCost", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponentCost").permanentId);

    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("tyrant"));

    expect(s.perm("opponentCost").isSuspended).toBe(true);
    expect(s.perm("ownInsect").currentDP).toBe(7000);
    expect(s.perm("ownPlain").currentDP).toBe(3000);
    expect(s.perm("opponentCost").currentDP).toBe(5000);
  });
});
