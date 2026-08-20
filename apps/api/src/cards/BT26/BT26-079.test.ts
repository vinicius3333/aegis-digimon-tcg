import { describe, it, expect, vi } from "vitest";
import { EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  EffectContext,
  GameAccess,
  Primitives,
  ReplacementInstallInstead,
  SubTriggerInstall,
} from "../../engine/effects/EffectContext.js";
import "./BT26-079.js";

// A3 for BT26-079 (ZombiePlutomon, BT26):
//   "[On Play] [When Digivolving] [When Attacking] By trashing 1 card in your hand,
//    delete 1 of your opponent's level 6 or lower Digimon."
//   "[Trash] [Main] If your hand has 5 or fewer cards, play this card with the cost
//    reduced by 4."
//
// FAILS-WHEN-REVERTED: dropping the `(def.level ?? 99) <= 6` filter (or skipping the
// trash cost) either deletes an over-level target or deletes for free; this test asserts
// the hand card is trashed before the correct opponent target is deleted, and that
// declining the cost blocks the delete entirely. The third test asserts the
// [Trash][Main] activated clause plays the source instance from the trash with the
// costDelta -4 reduction and is gated on hand size <= 5.

const CARD_ID = "BT26-079";

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
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(opts?: { isInTrash?: boolean; permanent?: unknown }): CardSource {
  return {
    instanceId: "zombieplutomon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => (opts?.permanent ?? { permanentId: "self-perm" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    isInTrash: () => opts?.isInTrash ?? false,
  };
}

describe("BT26-079 [On Play]/[When Digivolving]/[When Attacking]: trash-cost delete a level<=6 opponent Digimon", () => {
  it("trashes the chosen hand card, then deletes only the eligible opponent target", async () => {
    const handCard = { instanceId: "hand-1", cardId: "H-1" };
    const oppLow = { permanentId: "opp-low", topCard: { cardId: "AD1-001" }, inBreeding: false };
    const oppHigh = { permanentId: "opp-high", topCard: { cardId: "AD1-002" }, inBreeding: false };
    const players = [
      { seat: 0 as Seat, hand: [handCard] },
      { seat: 1 as Seat, battleArea: [oppHigh, oppLow] },
    ];

    const game: GameAccess = {
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      definitionOf: (card: { cardId: string }) =>
        fakeDef({ cardId: card.cardId, level: card.cardId === "AD1-001" ? 6 : 7 }),
    } as unknown as GameAccess;

    const trashed: string[][] = [];
    const deleted: string[][] = [];
    const fx = {
      trash: vi.fn<(...args: any[]) => any>(async (ids: string[]) => {
        trashed.push(ids);
        return ids;
      }),
      deletePermanent: vi.fn<(...args: any[]) => any>(async (ids: string[]) => {
        deleted.push(ids);
        return ids.length;
      }),
    } as unknown as Primitives;

    const ask = {
      selectCards: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => [opts.candidates[0]!]),
      chooseTargets: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => [opts.candidates[0]!]),
    } as unknown as EffectContext["ask"];

    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;

    const module = getEffectModule(CARD_ID);
    expect(module).toBeDefined();
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    const effect = effects.find((e) => e.effectKey === `${CARD_ID}/on-play-trash-cost-delete`);
    expect(effect).toBeDefined();

    await effect!.resolve(ctx);

    expect(trashed).toEqual([["hand-1"]]);
    expect(deleted).toEqual([["opp-low"]]);
  });

  it("does not delete when the player declines to pay the trash cost", async () => {
    const oppLow = { permanentId: "opp-low", topCard: { cardId: "AD1-001" }, inBreeding: false };
    const players = [
      { seat: 0 as Seat, hand: [{ instanceId: "hand-1", cardId: "H-1" }] },
      { seat: 1 as Seat, battleArea: [oppLow] },
    ];

    const game: GameAccess = {
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      definitionOf: () => fakeDef({ level: 6 }),
    } as unknown as GameAccess;

    const deleted: unknown[] = [];
    const fx = {
      trash: vi.fn<(...args: any[]) => any>(async () => []),
      deletePermanent: vi.fn<(...args: any[]) => any>(async () => deleted.push(1)),
    } as unknown as Primitives;
    const ask = { selectCards: vi.fn<(...args: any[]) => any>(async () => []) } as unknown as EffectContext["ask"];

    const source = makeSource();
    const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
    const module = getEffectModule(CARD_ID);
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    const effect = effects.find((e) => e.effectKey === `${CARD_ID}/on-play-trash-cost-delete`);

    await effect!.resolve(ctx);

    expect(deleted).toEqual([]);
  });
});

describe("BT26-079 [Trash][Main]: play this card from the trash with the cost reduced by 4", () => {
  it("is only activatable while the source sits in the trash, gated on hand size <= 5", () => {
    const inTrashSource = makeSource({ isInTrash: true });
    const onFieldSource = makeSource({ isInTrash: false });

    const module = getEffectModule(CARD_ID);
    expect(module).toBeDefined();

    const trashEffects = module!.effectsForTiming(EffectTiming.OnDeclaration, inTrashSource);
    const playFromTrash = trashEffects.find((e) => e.effectKey === `${CARD_ID}/trash-main-play-with-cost-reduced`);
    expect(playFromTrash).toBeDefined();

    const players = [{ seat: 0 as Seat, hand: [1, 2, 3, 4, 5] }];
    const game = { player: () => players[0] as never } as unknown as GameAccess;

    // Eligible: hand has exactly 5 cards (<= 5).
    expect(playFromTrash!.canActivate({ source: inTrashSource, game } as unknown as EffectContext)).toBe(true);

    // The `activated` builder's baseGuard requires trash residency for an isFromTrash effect.
    const onFieldEffects = module!.effectsForTiming(EffectTiming.OnDeclaration, onFieldSource);
    const onFieldClause = onFieldEffects.find((e) => e.effectKey === `${CARD_ID}/trash-main-play-with-cost-reduced`);
    expect(onFieldClause!.canTrigger({ source: onFieldSource } as unknown as EffectContext)).toBe(false);
  });

  it("plays the source instance from the trash with the cost reduced by 4", async () => {
    const source = makeSource({ isInTrash: true });
    const players = [{ seat: 0 as Seat, hand: [1, 2, 3, 4, 5] }];
    const game = { player: () => players[0] as never } as unknown as GameAccess;

    const played: Array<[string[], unknown]> = [];
    const fx = {
      playInstances: vi.fn<(...args: any[]) => any>(async (ids: string[], opts: unknown) => {
        played.push([ids, opts]);
        return [];
      }),
    } as unknown as Primitives;

    const ctx = { source, trigger: {}, game, fx, ask: {} } as unknown as EffectContext;

    const module = getEffectModule(CARD_ID);
    const effects = module!.effectsForTiming(EffectTiming.OnDeclaration, source);
    const playFromTrash = effects.find((e) => e.effectKey === `${CARD_ID}/trash-main-play-with-cost-reduced`);
    expect(playFromTrash).toBeDefined();

    await playFromTrash!.resolve(ctx);

    expect(played).toEqual([[["zombieplutomon-top"], { payCost: true, costDelta: 4 }]]);
  });
});

describe("BT26-079 [All Turns] once-per-turn hand trash trigger", () => {
  it("shares a once-per-turn key across opponent play and digivolve triggers", async () => {
    const source = makeSource();
    const subscriptions: Array<{ event: string; oncePerTurnKey?: string }> = [];
    const module = getEffectModule(CARD_ID);
    const staticEffects = module!.effectsForTiming(EffectTiming.None, source);
    const triggerEffect = staticEffects.find(
      (effect) => effect.effectKey === `${CARD_ID}/all-turns-opponent-play-or-digivolve-trash-down`,
    );
    expect(triggerEffect).toBeDefined();

    const ctx = {
      source,
      game: { player: () => ({ battleArea: [] }) },
      fx: {
        subscribeSubTrigger: vi.fn<(...args: any[]) => any>((options: { event: string; oncePerTurnKey?: string }) =>
          subscriptions.push(options),
        ),
      },
    } as unknown as EffectContext;

    await triggerEffect!.resolve(ctx);

    expect(subscriptions).toHaveLength(2);
    expect(subscriptions.map((subscription) => subscription.event)).toEqual(["whenPlayed", "whenOneOfYoursDigivolves"]);
    expect(new Set(subscriptions.map((subscription) => subscription.oncePerTurnKey))).toEqual(
      new Set([`${CARD_ID}/all-turns-opponent-play-or-digivolve-trash-down`]),
    );
  });

  it("matches only opposing Digimon, never own Digimon or opposing Tamers", async () => {
    const source = makeSource();
    const subscriptions: Array<{
      event: string;
      matches?: (ctx: EffectContext) => boolean;
    }> = [];
    const permanents = {
      "opp-digimon": { permanentId: "opp-digimon", controllerSeat: 1, topCard: { cardId: "DIGI" } },
      "own-digimon": { permanentId: "own-digimon", controllerSeat: 0, topCard: { cardId: "DIGI" } },
      "opp-tamer": { permanentId: "opp-tamer", controllerSeat: 1, topCard: { cardId: "TAMER" } },
    } as const;
    const game = {
      permanentById: (id: keyof typeof permanents) => permanents[id],
      definitionOf: (card: { cardId: string }) =>
        fakeDef({ kinds: (card.cardId === "TAMER" ? ["Tamer"] : ["Digimon"]) as never }),
    } as unknown as GameAccess;
    const effect = getEffectModule(CARD_ID)!
      .effectsForTiming(EffectTiming.None, source)
      .find((candidate) => candidate.effectKey === `${CARD_ID}/all-turns-opponent-play-or-digivolve-trash-down`)!;
    await effect.resolve({
      source,
      game,
      fx: { subscribeSubTrigger: (sub: (typeof subscriptions)[number]) => subscriptions.push(sub) },
    } as unknown as EffectContext);

    const playWatcher = subscriptions.find(({ event }) => event === "whenPlayed")!;
    const subCtx = (subjectPermanentId: string) =>
      ({ trigger: { subjectPermanentId }, game } as unknown as EffectContext);
    expect(playWatcher.matches!(subCtx("opp-digimon"))).toBe(true);
    expect(playWatcher.matches!(subCtx("own-digimon"))).toBe(false);
    expect(playWatcher.matches!(subCtx("opp-tamer"))).toBe(false);
  });

  it("has each player choose the exact overflow from their own hand down to 4", async () => {
    const source = makeSource();
    let watcher: SubTriggerInstall | undefined;
    const ownHand = Array.from({ length: 6 }, (_, index) => ({ instanceId: `own-${index}`, cardId: "H" }));
    const opponentHand = Array.from({ length: 7 }, (_, index) => ({ instanceId: `opp-${index}`, cardId: "H" }));
    const players = [{ hand: ownHand }, { hand: opponentHand }];
    const game = {
      player: (seat: Seat) => players[seat],
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
    } as unknown as GameAccess;
    const effect = getEffectModule(CARD_ID)!
      .effectsForTiming(EffectTiming.None, source)
      .find((candidate) => candidate.effectKey === `${CARD_ID}/all-turns-opponent-play-or-digivolve-trash-down`)!;
    await effect.resolve({
      source,
      game,
      fx: {
        subscribeSubTrigger: (sub: SubTriggerInstall) => {
          if (sub.event === "whenPlayed") watcher = sub;
        },
      },
    } as unknown as EffectContext);

    const controllerSelections: Array<{ candidates: string[]; min: number; max: number }> = [];
    const opponentSelections: Array<{ candidates: string[]; min: number; max: number }> = [];
    const trashed: string[][] = [];
    await watcher!.run({
      source,
      game,
      ask: {
        selectCards: async (_ctx: unknown, options: { candidates: string[]; min: number; max: number }) => {
          controllerSelections.push(options);
          return options.candidates.slice(0, options.max);
        },
        opponent: {
          selectCards: async (_ctx: unknown, options: { candidates: string[]; min: number; max: number }) => {
            opponentSelections.push(options);
            return options.candidates.slice(0, options.max);
          },
        },
      },
      fx: { trash: async (ids: string[]) => void trashed.push(ids) },
    } as unknown as EffectContext);

    expect(controllerSelections).toEqual([
      expect.objectContaining({ candidates: ownHand.map(({ instanceId }) => instanceId), min: 2, max: 2 }),
    ]);
    expect(opponentSelections).toEqual([
      expect.objectContaining({ candidates: opponentHand.map(({ instanceId }) => instanceId), min: 3, max: 3 }),
    ]);
    expect(trashed).toEqual([
      ["own-0", "own-1"],
      ["opp-0", "opp-1", "opp-2"],
    ]);
  });
});

describe("BT26-079 ＜Decode ([Plutomon])＞", () => {
  it("installs a self-only, non-battle replacement and plays exactly one matching stack card for free", async () => {
    const stack = [
      { instanceId: "plutomon", cardId: "PLUTO" },
      { instanceId: "near-match", cardId: "NEAR" },
    ];
    const permanent = { permanentId: "self-perm", stack };
    const source = makeSource({ permanent });
    let replacement: ReplacementInstallInstead | undefined;
    const game = {
      definitionOf: (card: { cardId: string }) =>
        fakeDef({
          cardId: card.cardId,
          nameEn: card.cardId === "PLUTO" ? "Plutomon" : "Pluto",
          kinds: ["Digimon"] as never,
        }),
    } as unknown as GameAccess;
    const decode = getEffectModule(CARD_ID)!
      .effectsForTiming(EffectTiming.None, source)
      .find((effect) => effect.effectKey === `${CARD_ID}/decode-plutomon`)!;
    await decode.resolve({
      source,
      game,
      fx: { subscribeReplacement: (value: ReplacementInstallInstead) => (replacement = value) },
    } as unknown as EffectContext);

    expect(replacement).toMatchObject({
      event: "wouldLeavePlay",
      sourcePermanentId: "self-perm",
      mode: "instead",
    });
    expect(replacement!.causeAllows!("byEffect", 0 as Seat, false)).toBe(true);
    expect(replacement!.causeAllows!("byRule", 0 as Seat, false)).toBe(true);
    expect(replacement!.causeAllows!("byBattle", 0 as Seat, false)).toBe(false);
    expect(replacement!.appliesTo!({} as EffectContext, "self-perm")).toBe(true);
    expect(replacement!.appliesTo!({} as EffectContext, "other-perm")).toBe(false);

    const selected: string[][] = [];
    const played: Array<[string[], unknown]> = [];
    await replacement!.apply({
      source,
      game,
      ask: {
        selectCards: async (_ctx: unknown, opts: { candidates: string[] }) => {
          selected.push(opts.candidates);
          return [opts.candidates[0]!];
        },
      },
      fx: {
        playInstances: async (ids: string[], opts: unknown) => {
          played.push([ids, opts]);
          return [];
        },
      },
    } as unknown as EffectContext);

    expect(selected).toEqual([["plutomon"]]);
    expect(played).toEqual([[["plutomon"], { payCost: false }]]);
  });

  it("allows Decode to be declined without playing a stack card", async () => {
    const permanent = { permanentId: "self-perm", stack: [{ instanceId: "plutomon", cardId: "PLUTO" }] };
    const source = makeSource({ permanent });
    let replacement: ReplacementInstallInstead | undefined;
    const game = {
      definitionOf: () => fakeDef({ nameEn: "Plutomon", kinds: ["Digimon"] as never }),
    } as unknown as GameAccess;
    const decode = getEffectModule(CARD_ID)!
      .effectsForTiming(EffectTiming.None, source)
      .find((effect) => effect.effectKey === `${CARD_ID}/decode-plutomon`)!;
    await decode.resolve({
      source,
      game,
      fx: { subscribeReplacement: (value: ReplacementInstallInstead) => (replacement = value) },
    } as unknown as EffectContext);
    const playInstances = vi.fn();
    await replacement!.apply({
      source,
      game,
      ask: { selectCards: async () => [] },
      fx: { playInstances },
    } as unknown as EffectContext);

    expect(playInstances).not.toHaveBeenCalled();
  });
});
