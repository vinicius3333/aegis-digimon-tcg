import { describe, expect, it, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import "./BT26-077.js";

const CARD_ID = "BT26-077";
const SHARED_KEY = `${CARD_ID}/play-ver3-from-trash`;

function fakeDefinition(cardId: string, over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: "TEST",
    nameEn: cardId,
    kinds: [CardKind.Digimon],
    colors: ["Purple"] as never,
    playCost: 3,
    dp: 1000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  } as CardDefinition;
}

function makeSource(stack: { instanceId: string; faceUp: boolean }[] = []): CardSource {
  return {
    instanceId: "reapermon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(CARD_ID),
    permanent: () => ({ permanentId: "reapermon-perm", stack }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function sharedContext({
  source,
  trash,
  definitions,
  selected,
}: {
  source: CardSource;
  trash: { instanceId: string; cardId: string }[];
  definitions: Record<string, CardDefinition>;
  selected?: string[];
}): { ctx: EffectContext; played: ReturnType<typeof vi.fn>; selectCards: ReturnType<typeof vi.fn> } {
  const players = [
    { seat: 0 as Seat, trash },
    { seat: 1 as Seat, trash: [] },
  ];
  const game = {
    player: (seat: Seat) => players[seat],
    definitionOf: (card: { cardId: string }) => definitions[card.cardId]!,
    permanentById: (permanentId: string) => (permanentId === "reapermon-perm" ? source.permanent() : undefined),
  } as unknown as GameAccess;
  const played = vi.fn(async () => undefined);
  const selectCards = vi.fn(async () => selected ?? [trash[0]!.instanceId]);
  const ctx = {
    source,
    trigger: {},
    game,
    fx: { playInstances: played } as unknown as Primitives,
    ask: { selectCards } as unknown as EffectContext["ask"],
  } as unknown as EffectContext;
  return { ctx, played, selectCards };
}

describe("BT26-077 shared optional Once Per Turn effect", () => {
  it("digivolves from a level 5 [DM] Digimon for the generated alternate cost 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-041", as: "base" }],
          hand: [{ card: CARD_ID, as: "reapermon" }],
          deck: ["BT5-022"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("reapermon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("reapermon").instanceId);

    expect(s.state.memory).toBe(0);
  });

  it("exposes the canonical Execute end-of-your-turn body only on its owner's turn", () => {
    const source = makeSource();
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnEndTurn, source)[0]!;
    const { ctx } = sharedContext({
      source,
      trash: [],
      definitions: {},
    });

    expect(effect).toMatchObject({ effectKey: `${CARD_ID}/execute`, optional: false });
    expect(effect.canTrigger(ctx)).toBe(true);

    const opponentTurnSource = { ...source, isOwnersTurn: () => false } satisfies CardSource;
    const opponentTurnEffect = getEffectModule(CARD_ID)!.effectsForTiming(
      EffectTiming.OnEndTurn,
      opponentTurnSource,
    )[0]!;
    const { ctx: opponentTurnContext } = sharedContext({
      source: opponentTurnSource,
      trash: [],
      definitions: {},
    });
    expect(opponentTurnEffect.canTrigger(opponentTurnContext)).toBe(false);
  });

  it("allows declining Execute without attacking or deleting Reapermon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "reapermon" }] } }, { autoDeclineOptional: true });

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("reapermon"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual([CARD_ID]);
    expect(s.perm("reapermon").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === CARD_ID)).toBe(false);
  });

  it("uses one optional effect identity across On Play, When Digivolving, and When Attacking", () => {
    const source = makeSource();
    const module = getEffectModule(CARD_ID)!;

    for (const timing of [EffectTiming.OnPlay, EffectTiming.WhenDigivolving, EffectTiming.OnAllyAttack]) {
      const effect = module.effectsForTiming(timing, source)[0]!;
      expect(effect).toMatchObject({ effectKey: SHARED_KEY, optional: true, maxPerTurn: 1 });
    }
  });

  it("filters for Digimon with the exact Ver.3 trait and the base play-cost ceiling", async () => {
    const source = makeSource();
    const trash = [
      { instanceId: "eligible", cardId: "eligible" },
      { instanceId: "wrong-trait", cardId: "wrong-trait" },
      { instanceId: "near-match", cardId: "near-match" },
      { instanceId: "tamer", cardId: "tamer" },
      { instanceId: "too-expensive", cardId: "too-expensive" },
    ];
    const definitions: Record<string, CardDefinition> = {
      eligible: fakeDefinition("eligible", { playCost: 6, types: ["DM", "Ver.3"] }),
      "wrong-trait": fakeDefinition("wrong-trait", { playCost: 6, types: ["DM"] }),
      "near-match": fakeDefinition("near-match", { playCost: 6, types: ["Ver.30"] }),
      tamer: fakeDefinition("tamer", { kinds: [CardKind.Tamer], playCost: 3, types: ["Ver.3"] }),
      "too-expensive": fakeDefinition("too-expensive", { playCost: 7, types: ["Ver.3"] }),
    };
    const { ctx, played, selectCards } = sharedContext({ source, trash, definitions, selected: ["eligible"] });
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnPlay, source)[0]!;

    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);

    expect(selectCards).toHaveBeenCalledWith(ctx, { candidates: ["eligible"], min: 1, max: 1 });
    expect(played).toHaveBeenCalledWith(["eligible"], { payCost: false });
  });

  it("adds exactly one to the ceiling per face-down digivolution card", async () => {
    const source = makeSource([
      { instanceId: "face-down", faceUp: false },
      { instanceId: "face-up", faceUp: true },
    ]);
    const trash = [
      { instanceId: "cost-seven", cardId: "cost-seven" },
      { instanceId: "cost-eight", cardId: "cost-eight" },
    ];
    const definitions = {
      "cost-seven": fakeDefinition("cost-seven", { playCost: 7, types: ["Ver.3"] }),
      "cost-eight": fakeDefinition("cost-eight", { playCost: 8, types: ["Ver.3"] }),
    };
    const { ctx, selectCards } = sharedContext({ source, trash, definitions, selected: ["cost-seven"] });
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]!;

    await effect.resolve(ctx);

    expect(selectCards).toHaveBeenCalledWith(ctx, { candidates: ["cost-seven"], min: 1, max: 1 });
  });

  it("cannot activate when the trash has no legal target", () => {
    const source = makeSource();
    const trash = [{ instanceId: "invalid", cardId: "invalid" }];
    const definitions = { invalid: fakeDefinition("invalid", { playCost: 7, types: ["Ver.3"] }) };
    const { ctx } = sharedContext({ source, trash, definitions });

    expect(getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]!.canActivate(ctx)).toBe(
      false,
    );
  });
});

describe("BT26-077 [On Deletion]", () => {
  it("deletes a highest-play-cost Tamer instead of a lower-cost Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "reapermon" }] },
        1: {
          battleArea: [
            { card: "BT5-022", as: "costFourDigimon" },
            { card: "BT26-104", as: "costFiveTamer" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("costFiveTamer").topCard.instanceId);

    await advance(s.engine).verb.deletePermanent([s.perm("reapermon").permanentId]);
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT5-022"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === CARD_ID)).toBe(true);
  });

  it("offers every tied highest-cost Digimon or Tamer and no lower-cost permanent", async () => {
    const source = makeSource();
    const opponents = [
      { permanentId: "high-digimon", topCard: { cardId: "high-digimon" } },
      { permanentId: "high-tamer", topCard: { cardId: "high-tamer" } },
      { permanentId: "low", topCard: { cardId: "low" } },
    ];
    const definitions: Record<string, CardDefinition> = {
      "high-digimon": fakeDefinition("high-digimon", { playCost: 5 }),
      "high-tamer": fakeDefinition("high-tamer", { kinds: [CardKind.Tamer], playCost: 5 }),
      low: fakeDefinition("low", { playCost: 4 }),
    };
    const chooseTargets = vi.fn(async () => ["high-tamer"]);
    const deletePermanent = vi.fn(async () => 1);
    const ctx = {
      source,
      trigger: { deletedInstanceIds: [source.instanceId] },
      game: {
        player: (seat: Seat) => (seat === 1 ? { battleArea: opponents } : { battleArea: [] }),
        opponentOf: () => 1 as Seat,
        definitionOf: (card: { cardId: string }) => definitions[card.cardId]!,
      } as unknown as GameAccess,
      ask: { chooseTargets } as unknown as EffectContext["ask"],
      fx: { deletePermanent } as unknown as Primitives,
    } as unknown as EffectContext;
    const effect = getEffectModule(CARD_ID)!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source)[0]!;

    expect(effect.canTrigger(ctx)).toBe(true);
    expect(effect.canActivate(ctx)).toBe(true);
    await effect.resolve(ctx);

    expect(chooseTargets).toHaveBeenCalledWith(ctx, {
      candidates: ["high-digimon", "high-tamer"],
      min: 1,
      max: 1,
    });
    expect(deletePermanent).toHaveBeenCalledWith(["high-tamer"], "byEffect");
  });
});
