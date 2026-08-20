import { describe, it, expect, vi } from "vitest";
import { EffectDuration, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-073.js";

// A3 for BT26-073 (Aegiochusmon: Dark, BT26): "[On Play] [When Digivolving] By deleting
// this Digimon or returning 1 [Shaman] or [TS] trait card from your trash to the bottom
// of the deck, delete 1 of your opponent's level 5 or lower Digimon."
//
// FAILS-WHEN-REVERTED: dropping the `(def.level ?? 99) <= 5` filter on the delete target
// (or skipping the cost) either deletes an over-level Digimon or deletes for free; this
// test asserts the paid cost (self-delete) and the exact delete target.

const CARD_ID = "BT26-073";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "AD1-001",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? (["Digimon"] as never),
    colors: (over.colors as never) ?? ([] as never),
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 0,
    level: over.level,
    types: over.types ?? [],
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(): CardSource {
  return {
    instanceId: "aegiochusmon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "self-perm" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

describe("BT26-073 [On Play]/[When Digivolving]: cost then delete a level<=5 opponent Digimon", () => {
  it("pays by self-deletion (no trash card available) then deletes only the low-level target", async () => {
    const oppLow = { permanentId: "opp-low", topCard: { cardId: "AD1-001" }, inBreeding: false };
    const oppHigh = { permanentId: "opp-high", topCard: { cardId: "AD1-002" }, inBreeding: false };
    const players = [
      { seat: 0 as Seat, battleArea: [], trash: [] },
      { seat: 1 as Seat, battleArea: [oppLow, oppHigh] },
    ];

    const game: GameAccess = {
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      definitionOf: (card: { cardId: string }) =>
        fakeDef({ cardId: card.cardId, level: card.cardId === "AD1-001" ? 4 : 6 }),
    } as unknown as GameAccess;

    const deleted: string[][] = [];
    const fx = {
      deletePermanent: vi.fn<(...args: any[]) => any>(async (ids: string[]) => {
        deleted.push(ids);
        return ids.length;
      }),
    } as unknown as Primitives;

    const source = makeSource();
    const ask = { optional: vi.fn<(...args: any[]) => any>(async () => true) } as unknown as EffectContext["ask"];
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;

    const module = getEffectModule(CARD_ID);
    expect(module).toBeDefined();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    const costDeleteEffect = effects.find((e) => e.effectKey === `${CARD_ID}/on-play-cost-delete`);
    expect(costDeleteEffect).toBeDefined();

    await costDeleteEffect!.resolve(ctx);

    // First call pays the cost (self-delete), second call deletes the eligible opponent target.
    expect(deleted).toEqual([["self-perm"], ["opp-low"]]);
  });

  it("lets the player decline the By-cost instead of forcing self-deletion", async () => {
    const source = makeSource();
    const game = {
      player: (seat: Seat) =>
        seat === 0
          ? { battleArea: [], trash: [] }
          : { battleArea: [{ permanentId: "opp", topCard: { cardId: "LOW" }, inBreeding: false }] },
      opponentOf: () => 1 as Seat,
      definitionOf: () => fakeDef({ level: 5 }),
    } as unknown as GameAccess;
    const fx = { deletePermanent: vi.fn() } as unknown as Primitives;
    const ask = { optional: vi.fn<(...args: any[]) => any>(async () => false) } as unknown as EffectContext["ask"];
    const effect = getEffectModule(CARD_ID)!
      .effectsForTiming(EffectTiming.WhenDigivolving, source)
      .find((candidate) => candidate.effectKey === `${CARD_ID}/when-digivolving-cost-delete`)!;

    await effect.resolve({ source, trigger: {}, game, fx, ask } as unknown as EffectContext);

    expect(ask.optional).toHaveBeenCalledOnce();
    expect(fx.deletePermanent).not.toHaveBeenCalled();
  });

  it("can return an exact Shaman/TS card from trash and does not accept near-matching traits", async () => {
    const exact = { instanceId: "exact", cardId: "EXACT" };
    const near = { instanceId: "near", cardId: "NEAR" };
    const opponent = { permanentId: "opp", topCard: { cardId: "LOW" }, inBreeding: false };
    const source = makeSource();
    const game = {
      player: (seat: Seat) =>
        seat === 0 ? { battleArea: [], trash: [near, exact] } : { battleArea: [opponent] },
      opponentOf: () => 1 as Seat,
      definitionOf: (card: { cardId: string }) =>
        card.cardId === "EXACT"
          ? fakeDef({ cardId: "EXACT", types: ["TS"] })
          : card.cardId === "NEAR"
            ? fakeDef({ cardId: "NEAR", types: ["TST"] })
            : fakeDef({ cardId: card.cardId, level: 5 }),
    } as unknown as GameAccess;
    const fx = {
      returnToDeck: vi.fn<(...args: any[]) => any>(async () => [exact]),
      deletePermanent: vi.fn<(...args: any[]) => any>(async () => 1),
    } as unknown as Primitives;
    const ask = {
      optional: vi.fn<(...args: any[]) => any>(async () => true),
      chooseOption: vi.fn<(...args: any[]) => any>(async () => 1),
      selectCards: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, options: { candidates: string[] }) => {
        expect(options.candidates).toEqual(["exact"]);
        return ["exact"];
      }),
    } as unknown as EffectContext["ask"];
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, source)[0]!;

    await effect.resolve({ source, trigger: {}, game, fx, ask } as unknown as EffectContext);

    expect(fx.returnToDeck).toHaveBeenCalledWith(["exact"], { toTop: false });
    expect(fx.deletePermanent).toHaveBeenCalledWith(["opp"], "byEffect");
  });

  it("does not grant the delete when the chosen cost is prevented", async () => {
    const source = makeSource();
    const game = {
      player: (seat: Seat) =>
        seat === 0
          ? { battleArea: [], trash: [] }
          : { battleArea: [{ permanentId: "opp", topCard: { cardId: "LOW" }, inBreeding: false }] },
      opponentOf: () => 1 as Seat,
      definitionOf: () => fakeDef({ level: 5 }),
    } as unknown as GameAccess;
    const fx = { deletePermanent: vi.fn<(...args: any[]) => any>(async () => 0) } as unknown as Primitives;
    const ask = { optional: vi.fn<(...args: any[]) => any>(async () => true) } as unknown as EffectContext["ask"];

    await getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, source)[0]!.resolve({
      source,
      trigger: {},
      game,
      fx,
      ask,
    } as unknown as EffectContext);

    expect(fx.deletePermanent).toHaveBeenCalledTimes(1);
    expect(fx.deletePermanent).toHaveBeenCalledWith(["self-perm"], "byEffect");
  });
});

describe("BT26-073 [On Deletion] and static clauses", () => {
  it("offers only play-cost-5-or-less exact [TS] cards from hand or trash and allows refusal", async () => {
    const source = makeSource();
    const handOk = { instanceId: "hand-ok", cardId: "HAND_OK" };
    const trashOk = { instanceId: "trash-ok", cardId: "TRASH_OK" };
    const tooCostly = { instanceId: "costly", cardId: "COSTLY" };
    const wrongTrait = { instanceId: "wrong", cardId: "WRONG" };
    const game = {
      player: () => ({ hand: [handOk, tooCostly], trash: [trashOk, wrongTrait] }),
      definitionOf: (card: { cardId: string }) =>
        fakeDef({
          cardId: card.cardId,
          playCost: card.cardId === "COSTLY" ? 6 : 5,
          types: card.cardId === "WRONG" ? ["TST"] : ["TS"],
        }),
    } as unknown as GameAccess;
    const fx = { playInstances: vi.fn() } as unknown as Primitives;
    const ask = {
      selectCards: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, options: { candidates: string[]; min: number; max: number }) => {
        expect(options).toEqual({ candidates: ["hand-ok", "trash-ok"], min: 0, max: 1 });
        return [];
      }),
    } as unknown as EffectContext["ask"];
    const effect = getEffectModule(CARD_ID)!
      .effectsForTiming(EffectTiming.OnDestroyedAnyone, source)
      .find((candidate) => candidate.effectKey === `${CARD_ID}/on-deletion-play-ts`)!;

    await effect.resolve({ source, trigger: {}, game, fx, ask } as unknown as EffectContext);

    expect(fx.playInstances).not.toHaveBeenCalled();
  });

  it("plays the selected eligible [TS] card for free", async () => {
    const source = makeSource();
    const eligible = { instanceId: "eligible", cardId: "ELIGIBLE" };
    const game = {
      player: () => ({ hand: [], trash: [eligible] }),
      definitionOf: () => fakeDef({ playCost: 5, types: ["TS"] }),
    } as unknown as GameAccess;
    const fx = { playInstances: vi.fn<(...args: any[]) => any>(async () => []) } as unknown as Primitives;
    const ask = { selectCards: vi.fn<(...args: any[]) => any>(async () => ["eligible"]) } as unknown as EffectContext["ask"];
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source)[0]!;

    await effect.resolve({ source, trigger: {}, game, fx, ask } as unknown as EffectContext);

    expect(fx.playInstances).toHaveBeenCalledWith(["eligible"], { payCost: false });
  });

  it("grants inherited Security A. +1 and the Rule Wizard trait through distinct static effects", async () => {
    const source = makeSource();
    const fx = {
      grantKeyword: vi.fn(),
      grantNameTrait: vi.fn(),
    } as unknown as Primitives;
    const ctx = { source, trigger: {}, game: {}, fx, ask: {} } as unknown as EffectContext;
    const effects = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.None, source);

    await effects.find((effect) => effect.effectKey === `${CARD_ID}/inherited-security-attack`)!.resolve(ctx);
    await effects.find((effect) => effect.effectKey === `${CARD_ID}/rule-wizard-trait`)!.resolve(ctx);

    expect(fx.grantKeyword).toHaveBeenCalledWith(
      "self-perm",
      "SecurityAttack",
      EffectDuration.UntilEachTurnEnd,
      1,
      { continuous: true },
    );
    expect(fx.grantNameTrait).toHaveBeenCalledWith(
      "self-perm",
      "trait",
      ["Wizard"],
      EffectDuration.Permanent,
    );
  });
});
