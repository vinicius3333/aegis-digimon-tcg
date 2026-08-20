import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-035.js";

// BT26-035 (Morphomon, BT26): "[When Moving] [On Play] You may suspend 1 Digimon."
//
// FAILS-WHEN-REVERTED: dropping the `inBreeding` / Digimon-kind filter widens the candidate
// list (asserted exactly); dropping `isSelfMove` lets the [When Moving] clause fire on another
// permanent's move; dropping the `min: 0` decline path suspends against the player's refusal.

const CARD_ID = "BT26-035";

function fakeDef(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: over.cardId ?? "AD1-001",
    set: "BT26",
    nameEn: over.nameEn ?? "Test",
    kinds: (over.kinds as never) ?? ([CardKind.Digimon] as never),
    colors: (over.colors as never) ?? ([] as never),
    playCost: over.playCost ?? 0,
    dp: over.dp ?? 0,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "morphomon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "morphomon" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

const digimonCard = { cardId: "AD1-001" };
const tamerCard = { cardId: "AD1-900" };

function makeContext(options: {
  mineBattleArea?: unknown[];
  theirBattleArea?: unknown[];
  chosen?: (candidates: string[]) => string[];
  trigger?: Record<string, unknown>;
}) {
  const players = [
    { seat: 0 as Seat, battleArea: options.mineBattleArea ?? [] },
    { seat: 1 as Seat, battleArea: options.theirBattleArea ?? [] },
  ];

  const game: GameAccess = {
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    definitionOf: (card: { cardId: string }) =>
      fakeDef({ kinds: (card.cardId === tamerCard.cardId ? [CardKind.Tamer] : [CardKind.Digimon]) as never }),
  } as unknown as GameAccess;

  const suspended: string[][] = [];
  const fx = {
    suspend: vi.fn<(...args: any[]) => any>(async (ids: string[]) => {
      suspended.push(ids);
      return ids;
    }),
  } as unknown as Primitives;

  const ask = {
    chooseTargets: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) =>
      options.chosen ? options.chosen(opts.candidates) : [opts.candidates[0]!],
    ),
  } as unknown as EffectContext["ask"];

  const source = makeSource();
  const ctx = { source, trigger: options.trigger ?? {}, game, fx, ask } as unknown as EffectContext;
  return { ctx, suspended, ask, source };
}

function effectFor(timing: EffectTiming, source: CardSource, key: string) {
  const module = getEffectModule(CARD_ID);
  expect(module).toBeDefined();
  const effect = module!.effectsForTiming(timing, source).find((e) => e.effectKey === `${CARD_ID}/${key}`);
  expect(effect).toBeDefined();
  return effect!;
}

describe("BT26-035 [On Play] / [When Moving]: you may suspend 1 Digimon", () => {
  it("suspends the chosen Digimon on play", async () => {
    const { ctx, suspended, source } = makeContext({
      theirBattleArea: [{ permanentId: "opp-digimon", topCard: digimonCard }],
    });

    await effectFor(EffectTiming.OnPlay, source, "on-play-suspend-digimon").resolve(ctx);

    expect(suspended).toEqual([["opp-digimon"]]);
  });

  it("offers Digimon from both seats and never a Tamer or a breeding-area Digimon", async () => {
    const seen: string[] = [];
    const { ctx, source } = makeContext({
      mineBattleArea: [
        { permanentId: "my-digimon", topCard: digimonCard },
        { permanentId: "my-tamer", topCard: tamerCard },
        { permanentId: "my-egg", topCard: digimonCard, inBreeding: true },
      ],
      theirBattleArea: [{ permanentId: "opp-digimon", topCard: digimonCard }],
      chosen: (candidates) => {
        seen.push(...candidates);
        return [];
      },
    });

    await effectFor(EffectTiming.OnPlay, source, "on-play-suspend-digimon").resolve(ctx);

    expect(seen).toEqual(["my-digimon", "opp-digimon"]);
  });

  it("suspends nothing when the controller declines", async () => {
    const { ctx, suspended, source } = makeContext({
      theirBattleArea: [{ permanentId: "opp-digimon", topCard: digimonCard }],
      chosen: () => [],
    });

    await effectFor(EffectTiming.OnPlay, source, "on-play-suspend-digimon").resolve(ctx);

    expect(suspended).toEqual([]);
  });

  it("cannot activate when no Digimon is on the battle area", async () => {
    const { ctx, source } = makeContext({ mineBattleArea: [{ permanentId: "my-tamer", topCard: tamerCard }] });

    expect(effectFor(EffectTiming.OnPlay, source, "on-play-suspend-digimon").canActivate(ctx)).toBe(false);
  });

  it("triggers the [When Moving] clause only for this card's own move", async () => {
    const source = makeSource();
    const moving = effectFor(EffectTiming.OnMove, source, "when-moving-suspend-digimon");

    const own = makeContext({
      theirBattleArea: [{ permanentId: "opp-digimon", topCard: digimonCard }],
      trigger: { movedPermanentId: "morphomon" },
    });
    const other = makeContext({
      theirBattleArea: [{ permanentId: "opp-digimon", topCard: digimonCard }],
      trigger: { movedPermanentId: "someone-else" },
    });

    expect(moving.canTrigger(own.ctx)).toBe(true);
    expect(moving.canTrigger(other.ctx)).toBe(false);

    await moving.resolve(own.ctx);
    expect(own.suspended).toEqual([["opp-digimon"]]);
  });
});
