import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectDuration, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
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
      for (const permanent of [...players[0]!.battleArea, ...players[1]!.battleArea] as Perm[]) {
        if (ids.includes(permanent.permanentId)) permanent.isSuspended = false;
      }
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
const USE_REQ_KEY = "use-req-ts";

describe("BT26-080 card data and use requirement", () => {
  it("waives the Purple Option requirement while its controller has a [TS] card in play", async () => {
    const source = makeSource();
    const harness = makeHarness({ source });
    harness.ctx.game.player(source.ownerSeat).battleArea.push({
      permanentId: "ts-card",
      topCard: { cardId: "ts" },
    } as never);
    harness.ctx.game.definitionOf = (card: { cardId: string }) =>
      fakeDef({ cardId: card.cardId, types: card.cardId === "ts" ? ["TS"] : [] });
    const waived: Array<[string, EffectDuration]> = [];
    harness.ctx.fx.waiveColorRequirement = (instanceId: string, duration: EffectDuration) => {
      waived.push([instanceId, duration]);
    };

    const effect = effectFor(EffectTiming.None, source, USE_REQ_KEY);
    expect(effect.canTrigger(harness.ctx)).toBe(true);
    await effect.resolve(harness.ctx);

    expect(waived).toEqual([[source.instanceId, EffectDuration.UntilEachTurnEnd]]);
  });

  it("does not waive the Option requirement for a near-matching non-TS trait", () => {
    const source = makeSource();
    const harness = makeHarness({ source });
    harness.ctx.game.player(source.ownerSeat).battleArea.push({
      permanentId: "near-match",
      topCard: { cardId: "near-match" },
    } as never);
    harness.ctx.game.definitionOf = (card: { cardId: string }) =>
      fakeDef({ cardId: card.cardId, types: ["TSP"] });

    expect(effectFor(EffectTiming.None, source, USE_REQ_KEY).canTrigger(harness.ctx)).toBe(false);
  });
});

describe("BT26-080 [When Digivolving]: suspend a Digimon to attack without suspending", () => {
  it("pays the cost first, then declares the attack without suspending", async () => {
    const harness = makeHarness({
      mine: [{ permanentId: "my-digimon", topCard: { cardId: DIGIMON } }],
    });

    await effectFor(EffectTiming.WhenDigivolving, harness.source, DIGIVOLVE_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual(["suspend:my-digimon", `forceAttack:${SELF_PERMANENT}:true`]);
  });

  // KB Q7113: the cost may suspend either player's Digimon.
  it("offers only unsuspended Digimon from either player as the mandatory accepted cost", async () => {
    const harness = makeHarness({
      mine: [
        { permanentId: "my-digimon", topCard: { cardId: DIGIMON } },
        { permanentId: "my-suspended", topCard: { cardId: DIGIMON }, isSuspended: true },
        { permanentId: "my-tamer", topCard: { cardId: TAMER } },
      ],
      theirs: [{ permanentId: "opp-digimon", topCard: { cardId: DIGIMON } }],
      pick: (candidates) => [candidates.at(-1)!],
    });

    const effect = effectFor(EffectTiming.WhenDigivolving, harness.source, DIGIVOLVE_KEY);
    await effect.resolve(harness.ctx);

    expect(harness.offered).toEqual([["my-digimon", "opp-digimon"]]);
    expect(harness.calls).toEqual(["suspend:opp-digimon", `forceAttack:${SELF_PERMANENT}:true`]);
    expect(effect.optional).toBe(true);
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
  it("may unsuspend an opponent Digimon and then deletes it as the now-lowest unsuspended Digimon", async () => {
    const harness = makeHarness({
      theirs: [{ permanentId: "opp-a", topCard: { cardId: DIGIMON }, currentDP: 4000, isSuspended: true }],
    });

    await effectFor(EffectTiming.OnUseOption, harness.source, MAIN_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual(["unsuspend:opp-a", "delete:opp-a"]);
    expect(harness.deleted).toEqual([["opp-a"]]);
  });
});

describe("BT26-080 engine behavior", () => {
  it("uses its Option side through the [TS] use requirement with no Purple source", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "bacchusmon" }],
          battleArea: [{ card: "BT24-019", as: "blueTs" }],
        },
        1: { battleArea: [{ card: "AD1-001", as: "lowest", dp: 3000, suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("bacchusmon").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("bacchusmon").instanceId) &&
        s.state.players[1]!.battleArea.length === 0,
      2000,
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("rejects the Option side without Purple or a [TS] card", async () => {
    const s = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "bacchusmon" }] } });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("bacchusmon").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("digivolves from the play-cost-12 Bacchusmon for the alternate cost 2", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-077", as: "base" }],
          hand: [{ card: CARD_ID, as: "bacchusmon" }],
          deck: ["BT5-022"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("bacchusmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("bacchusmon").instanceId, 2000);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.at(-1)?.cardId).toBe("BT25-077");
  });
});
