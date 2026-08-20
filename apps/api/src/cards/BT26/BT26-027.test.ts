import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectDuration, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-027.js";

// BT26-027 (Petermon, BT26): "[On Play] [Start of Opponent's Main Phase] By suspending 1 of
// your Digimon with the [Vegetation], [Fairy] or [WG] trait, give 1 of your opponent's
// Digimon <Security A. -2> until their turn ends."
//
// FAILS-WHEN-REVERTED: dropping the `isSuspended` / `inBreeding` / trait filters widens the
// cost candidates (asserted exactly); resolving the grant before the cost is declined would
// hand out <Security A. -2> for free; flipping the opponent-turn gate makes the second window
// fire on the controller's own main phase.

const CARD_ID = "BT26-027";

const TRAIT_DIGIMON = "trait-digimon";
const PLAIN_DIGIMON = "plain-digimon";
const TAMER = "tamer";

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

function definitionFor(cardId: string): CardDefinition {
  if (cardId === TAMER) return fakeDef({ cardId, kinds: [CardKind.Tamer] as never, types: ["Fairy"] });
  if (cardId === TRAIT_DIGIMON) return fakeDef({ cardId, types: ["Vegetation"] });
  return fakeDef({ cardId, types: ["Machine"] });
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "petermon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "petermon" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

interface Perm {
  permanentId: string;
  topCard?: { cardId: string };
  isSuspended?: boolean;
  inBreeding?: boolean;
}

function makeHarness(options: {
  mine?: Perm[];
  theirs?: Perm[];
  costPick?: (candidates: string[]) => string[];
  source?: CardSource;
}) {
  const players = [
    { seat: 0 as Seat, battleArea: options.mine ?? [] },
    { seat: 1 as Seat, battleArea: options.theirs ?? [] },
  ];

  const game: GameAccess = {
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    definitionOf: (card: { cardId: string }) => definitionFor(card.cardId),
  } as unknown as GameAccess;

  const suspended: string[][] = [];
  const grants: unknown[] = [];
  const fx = {
    suspend: vi.fn<(...args: any[]) => any>(async (ids: string[]) => {
      suspended.push(ids);
      return ids;
    }),
    grantKeyword: vi.fn<(...args: any[]) => any>((permanentId: string, keyword: string, duration: EffectDuration, amount?: number) => {
      grants.push({ permanentId, keyword, duration, amount });
    }),
  } as unknown as Primitives;

  const asked: string[][] = [];
  const ask = {
    chooseTargets: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => {
      asked.push(opts.candidates);
      if (asked.length === 1) return options.costPick ? options.costPick(opts.candidates) : [opts.candidates[0]!];
      return [opts.candidates[0]!];
    }),
  } as unknown as EffectContext["ask"];

  const source = options.source ?? makeSource();
  const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
  return { ctx, suspended, grants, asked, source };
}

function effectFor(timing: EffectTiming, source: CardSource, key: string) {
  const module = getEffectModule(CARD_ID);
  expect(module).toBeDefined();
  const effect = module!.effectsForTiming(timing, source).find((e) => e.effectKey === `${CARD_ID}/${key}`);
  expect(effect).toBeDefined();
  return effect!;
}

const ON_PLAY_KEY = "on-play-suspend-weaken-security-attack";
const OPPONENT_MAIN_KEY = "opponent-main-suspend-weaken-security-attack";

describe("BT26-027 [On Play] / [Start of Opponent's Main Phase]: suspend a trait Digimon to weaken security attack", () => {
  it("suspends the paid Digimon then grants <Security A. -2> to the opponent's Digimon", async () => {
    const harness = makeHarness({
      mine: [{ permanentId: "my-trait", topCard: { cardId: TRAIT_DIGIMON } }],
      theirs: [{ permanentId: "opp-digimon", topCard: { cardId: PLAIN_DIGIMON } }],
    });

    await effectFor(EffectTiming.OnPlay, harness.source, ON_PLAY_KEY).resolve(harness.ctx);

    expect(harness.suspended).toEqual([["my-trait"]]);
    expect(harness.grants).toEqual([
      {
        permanentId: "opp-digimon",
        keyword: "SecurityAttack",
        duration: EffectDuration.UntilOpponentTurnEnd,
        amount: -2,
      },
    ]);
    // A lone opponent Digimon is taken without a second prompt.
    expect(harness.asked).toEqual([["my-trait"]]);
  });

  it("offers only unsuspended, non-breeding, trait Digimon the controller owns as the cost", async () => {
    const harness = makeHarness({
      mine: [
        { permanentId: "my-trait", topCard: { cardId: TRAIT_DIGIMON } },
        { permanentId: "my-trait-suspended", topCard: { cardId: TRAIT_DIGIMON }, isSuspended: true },
        { permanentId: "my-trait-breeding", topCard: { cardId: TRAIT_DIGIMON }, inBreeding: true },
        { permanentId: "my-trait-tamer", topCard: { cardId: TAMER } },
        { permanentId: "my-plain", topCard: { cardId: PLAIN_DIGIMON } },
      ],
      theirs: [{ permanentId: "opp-trait", topCard: { cardId: TRAIT_DIGIMON } }],
    });

    await effectFor(EffectTiming.OnPlay, harness.source, ON_PLAY_KEY).resolve(harness.ctx);

    expect(harness.asked[0]).toEqual(["my-trait"]);
  });

  it("grants nothing when the controller declines to pay the cost", async () => {
    const harness = makeHarness({
      mine: [{ permanentId: "my-trait", topCard: { cardId: TRAIT_DIGIMON } }],
      theirs: [{ permanentId: "opp-digimon", topCard: { cardId: PLAIN_DIGIMON } }],
      costPick: () => [],
    });

    await effectFor(EffectTiming.OnPlay, harness.source, ON_PLAY_KEY).resolve(harness.ctx);

    expect(harness.suspended).toEqual([]);
    expect(harness.grants).toEqual([]);
  });

  it("still pays the cost when the opponent has no Digimon to weaken", async () => {
    const harness = makeHarness({
      mine: [{ permanentId: "my-trait", topCard: { cardId: TRAIT_DIGIMON } }],
      theirs: [{ permanentId: "opp-tamer", topCard: { cardId: TAMER } }],
    });

    await effectFor(EffectTiming.OnPlay, harness.source, ON_PLAY_KEY).resolve(harness.ctx);

    expect(harness.suspended).toEqual([["my-trait"]]);
    expect(harness.grants).toEqual([]);
  });

  it("cannot activate when no trait Digimon can pay", async () => {
    const harness = makeHarness({
      mine: [{ permanentId: "my-plain", topCard: { cardId: PLAIN_DIGIMON } }],
      theirs: [{ permanentId: "opp-digimon", topCard: { cardId: PLAIN_DIGIMON } }],
    });

    expect(effectFor(EffectTiming.OnPlay, harness.source, ON_PLAY_KEY).canActivate(harness.ctx)).toBe(false);
  });

  it("fires the second window only during the opponent's main phase", () => {
    const onOpponentTurn = makeHarness({ source: makeSource({ isOwnersTurn: () => false }) });
    const onOwnTurn = makeHarness({ source: makeSource({ isOwnersTurn: () => true }) });

    expect(
      effectFor(EffectTiming.OnStartMainPhase, onOpponentTurn.source, OPPONENT_MAIN_KEY).canTrigger(onOpponentTurn.ctx),
    ).toBe(true);
    expect(
      effectFor(EffectTiming.OnStartMainPhase, onOwnTurn.source, OPPONENT_MAIN_KEY).canTrigger(onOwnTurn.ctx),
    ).toBe(false);
  });
});
