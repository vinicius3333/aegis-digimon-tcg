import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-080.js";

// BT26-080 (Bacchusmon, BT26 dual Digimon/Option):
//   "[When Digivolving] By suspending 1 Digimon, this Digimon may attack without suspending."
//   "[When Attacking] [Once Per Turn] Delete 1 of your opponent's Digimon with the same
//    orientation as this Digimon."
//   "[Main] You may unsuspend 1 Digimon. Then, delete all of your opponent's unsuspended
//    Digimon with the lowest DP."
//
// KB: Q7112 (orientation = suspended/unsuspended state), Q7113 (the [When Digivolving] cost may
// suspend either player's Digimon), Q7114 (the [Main] unsuspend may target either player's).
//
// FAILS-WHEN-REVERTED: attacking before the cost is paid (or on a decline) gives a free
// attack; dropping the orientation comparison deletes a differently-oriented Digimon;
// deleting only one lowest-DP Digimon misses the printed "all"; including suspended opponent
// Digimon in the Option's delete widens it.

const CARD_ID = "BT26-080";
const SELF_PERMANENT = "bacchusmon";

const DIGIMON = "digimon";
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

interface Perm {
  permanentId: string;
  topCard?: { cardId: string };
  isSuspended?: boolean;
  inBreeding?: boolean;
  currentDP?: number;
}

function makeSource(selfSuspended = false, over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "bacchusmon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: SELF_PERMANENT, isSuspended: selfSuspended }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

function makeHarness(options: {
  mine?: Perm[];
  theirs?: Perm[];
  pick?: (candidates: string[]) => string[];
  source?: CardSource;
}) {
  const players = [
    { seat: 0 as Seat, battleArea: options.mine ?? [] },
    { seat: 1 as Seat, battleArea: options.theirs ?? [] },
  ];

  const game: GameAccess = {
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    definitionOf: (card: { cardId: string }) =>
      fakeDef({ kinds: (card.cardId === TAMER ? [CardKind.Tamer] : [CardKind.Digimon]) as never }),
  } as unknown as GameAccess;

  const calls: string[] = [];
  const deleted: string[][] = [];
  const fx = {
    suspend: vi.fn<(...args: any[]) => any>(async (ids: string[]) => {
      calls.push(`suspend:${ids.join(",")}`);
      return ids;
    }),
    unsuspend: vi.fn<(...args: any[]) => any>(async (ids: string[]) => {
      calls.push(`unsuspend:${ids.join(",")}`);
    }),
    forceAttack: vi.fn<(...args: any[]) => any>(async (id: string, opts?: { withoutSuspending?: boolean }) => {
      calls.push(`forceAttack:${id}:${opts?.withoutSuspending === true}`);
    }),
    deletePermanent: vi.fn<(...args: any[]) => any>(async (ids: string[]) => {
      calls.push(`delete:${ids.join(",")}`);
      deleted.push(ids);
      return ids.length;
    }),
  } as unknown as Primitives;

  const offered: string[][] = [];
  const ask = {
    chooseTargets: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => {
      offered.push(opts.candidates);
      return options.pick ? options.pick(opts.candidates) : [opts.candidates[0]!];
    }),
  } as unknown as EffectContext["ask"];

  const source = options.source ?? makeSource();
  const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
  return { ctx, calls, deleted, offered, source };
}

function effectFor(timing: EffectTiming, source: CardSource, key: string) {
  const module = getEffectModule(CARD_ID);
  expect(module).toBeDefined();
  const effect = module!.effectsForTiming(timing, source).find((e) => e.effectKey === `${CARD_ID}/${key}`);
  expect(effect).toBeDefined();
  return effect!;
}

const DIGIVOLVE_KEY = "when-digivolving-attack-without-suspending";
const ATTACK_KEY = "when-attacking-delete-same-orientation";
const MAIN_KEY = "main-unsuspend-then-delete-lowest-dp";

describe("BT26-080 [When Digivolving]: suspend a Digimon to attack without suspending", () => {
  it("pays the cost first, then declares the attack without suspending", async () => {
    const harness = makeHarness({
      mine: [{ permanentId: "my-digimon", topCard: { cardId: DIGIMON } }],
    });

    await effectFor(EffectTiming.WhenDigivolving, harness.source, DIGIVOLVE_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual(["suspend:my-digimon", `forceAttack:${SELF_PERMANENT}:true`]);
  });

  // KB Q7113: the cost may suspend either player's Digimon.
  it("offers only unsuspended Digimon and never attacks when the cost is declined", async () => {
    const harness = makeHarness({
      mine: [
        { permanentId: "my-digimon", topCard: { cardId: DIGIMON } },
        { permanentId: "my-suspended", topCard: { cardId: DIGIMON }, isSuspended: true },
        { permanentId: "my-tamer", topCard: { cardId: TAMER } },
      ],
      theirs: [{ permanentId: "opp-digimon", topCard: { cardId: DIGIMON } }],
      pick: () => [],
    });

    await effectFor(EffectTiming.WhenDigivolving, harness.source, DIGIVOLVE_KEY).resolve(harness.ctx);

    expect(harness.offered).toEqual([["my-digimon", "opp-digimon"]]);
    expect(harness.calls).toEqual([]);
  });

  it("cannot activate with no unsuspended Digimon to suspend", () => {
    const harness = makeHarness({
      mine: [{ permanentId: "my-suspended", topCard: { cardId: DIGIMON }, isSuspended: true }],
    });

    expect(effectFor(EffectTiming.WhenDigivolving, harness.source, DIGIVOLVE_KEY).canActivate(harness.ctx)).toBe(false);
  });
});

describe("BT26-080 [When Attacking]: delete an opponent Digimon sharing this one's orientation", () => {
  it("deletes only a matching-orientation opponent Digimon while unsuspended", async () => {
    const harness = makeHarness({
      source: makeSource(false),
      theirs: [
        { permanentId: "opp-suspended", topCard: { cardId: DIGIMON }, isSuspended: true },
        { permanentId: "opp-unsuspended", topCard: { cardId: DIGIMON } },
      ],
    });

    await effectFor(EffectTiming.OnUseAttack, harness.source, ATTACK_KEY).resolve(harness.ctx);

    expect(harness.deleted).toEqual([["opp-unsuspended"]]);
  });

  it("flips the matching set when this Digimon is suspended", async () => {
    const harness = makeHarness({
      source: makeSource(true),
      theirs: [
        { permanentId: "opp-suspended", topCard: { cardId: DIGIMON }, isSuspended: true },
        { permanentId: "opp-unsuspended", topCard: { cardId: DIGIMON } },
      ],
    });

    await effectFor(EffectTiming.OnUseAttack, harness.source, ATTACK_KEY).resolve(harness.ctx);

    expect(harness.deleted).toEqual([["opp-suspended"]]);
  });

  it("deletes nothing when no opponent Digimon shares the orientation", async () => {
    const harness = makeHarness({
      source: makeSource(true),
      theirs: [{ permanentId: "opp-unsuspended", topCard: { cardId: DIGIMON } }],
    });

    await effectFor(EffectTiming.OnUseAttack, harness.source, ATTACK_KEY).resolve(harness.ctx);

    expect(harness.deleted).toEqual([]);
  });

  it("is capped at once per turn", () => {
    expect(effectFor(EffectTiming.OnUseAttack, makeSource(), ATTACK_KEY).maxPerTurn).toBe(1);
  });
});

describe("BT26-080 [Main]: unsuspend 1 Digimon, then delete the lowest-DP unsuspended opponents", () => {
  it("unsuspends the chosen Digimon and deletes every lowest-DP unsuspended opponent Digimon", async () => {
    const harness = makeHarness({
      mine: [{ permanentId: "my-suspended", topCard: { cardId: DIGIMON }, isSuspended: true }],
      theirs: [
        { permanentId: "opp-low-a", topCard: { cardId: DIGIMON }, currentDP: 3000 },
        { permanentId: "opp-low-b", topCard: { cardId: DIGIMON }, currentDP: 3000 },
        { permanentId: "opp-high", topCard: { cardId: DIGIMON }, currentDP: 9000 },
        { permanentId: "opp-low-suspended", topCard: { cardId: DIGIMON }, currentDP: 1000, isSuspended: true },
      ],
    });

    await effectFor(EffectTiming.OnUseOption, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual(["unsuspend:my-suspended", "delete:opp-low-a,opp-low-b"]);
  });

  it("still deletes when the unsuspend is declined", async () => {
    const harness = makeHarness({
      mine: [{ permanentId: "my-suspended", topCard: { cardId: DIGIMON }, isSuspended: true }],
      theirs: [{ permanentId: "opp-a", topCard: { cardId: DIGIMON }, currentDP: 4000 }],
      pick: () => [],
    });

    await effectFor(EffectTiming.OnUseOption, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual(["delete:opp-a"]);
  });

  // KB Q7114: the unsuspend may target either player's Digimon.
  it("deletes nothing when every opponent Digimon is suspended", async () => {
    const harness = makeHarness({
      theirs: [{ permanentId: "opp-a", topCard: { cardId: DIGIMON }, currentDP: 4000, isSuspended: true }],
    });

    await effectFor(EffectTiming.OnUseOption, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual(["unsuspend:opp-a"]);
    expect(harness.deleted).toEqual([]);
  });
});
