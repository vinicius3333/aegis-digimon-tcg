import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT26-060.js";
import "../index.js";

// BT26-060 (Chronomon: Destroy Mode, BT26):
//   "[On Play] [When Digivolving] Return the top 5 stacked cards of 3 of your opponent's
//    Digimon to the top of the deck."
//   "[All Turns] [Once Per Turn] When your effects add to decks, you may delete 1 of your
//    opponent's Digimon."
//
// KB: Q7079 (choose 3, return each stack's top 5), Q7080 (the activating player orders the
// returned cards), Q7081 (a shorter stack gives up all its stacked cards), Q7086 (a deck-add on
// the OPPONENT's deck also triggers the watcher).
//
// FAILS-WHEN-REVERTED: reading the stack bottom-first returns the wrong five cards (order and
// membership are asserted); dropping the empty-stack filter offers a Digimon with nothing to
// return; re-adding an own-seat gate on effectAddedToDeckSeat breaks the Q7086 case this card's
// own first clause depends on.

const CARD_ID = "BT26-060";
const SELF_PERMANENT = "chronomon-destroy";

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

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "chronomon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: SELF_PERMANENT }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

interface Perm {
  permanentId: string;
  topCard?: { cardId: string };
  inBreeding?: boolean;
  stack?: { instanceId: string }[];
}

function stackOf(permanentId: string, size: number): { instanceId: string }[] {
  // Bottom (index 0) -> top (last), the engine's stack ordering.
  return Array.from({ length: size }, (_, i) => ({ instanceId: `${permanentId}-s${i}` }));
}

function makeHarness(options: {
  theirs?: Perm[];
  pick?: (candidates: string[]) => string[];
  order?: (candidates: string[]) => string[];
  trigger?: Record<string, unknown>;
  source?: CardSource;
}) {
  const theirs = (options.theirs ?? []).map((p) => ({ stack: [], ...p }));
  const permanents = new Map<string, Perm>([[SELF_PERMANENT, { permanentId: SELF_PERMANENT, stack: [] }]]);
  for (const p of theirs) permanents.set(p.permanentId, p);

  const players = [
    { seat: 0 as Seat, battleArea: [] },
    { seat: 1 as Seat, battleArea: theirs },
  ];

  const game: GameAccess = {
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => permanents.get(id) as never,
    definitionOf: (card: { cardId: string }) =>
      fakeDef({ kinds: (card.cardId === TAMER ? [CardKind.Tamer] : [CardKind.Digimon]) as never }),
  } as unknown as GameAccess;

  const returned: { ids: string[]; opts: unknown }[] = [];
  const deleted: string[][] = [];
  const installs: SubTriggerInstall[] = [];
  const fx = {
    returnToDeck: vi.fn<(...args: any[]) => any>(async (ids: string[], opts: unknown) => {
      returned.push({ ids, opts });
      return [];
    }),
    deletePermanent: vi.fn<(...args: any[]) => any>(async (ids: string[]) => {
      deleted.push(ids);
      return ids.length;
    }),
    subscribeSubTrigger: vi.fn<(...args: any[]) => any>((sub: SubTriggerInstall) => {
      installs.push(sub);
      return installs.length;
    }),
  } as unknown as Primitives;

  const offered: string[][] = [];
  const ask = {
    chooseTargets: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => {
      offered.push(opts.candidates);
      return options.pick ? options.pick(opts.candidates) : [opts.candidates[0]!];
    }),
    ...(options.order === undefined
      ? {}
      : {
          orderCards: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) =>
            options.order!(opts.candidates),
          ),
        }),
  } as unknown as EffectContext["ask"];

  const source = options.source ?? makeSource();
  const ctx = { source, trigger: options.trigger ?? {}, game, fx, ask } as unknown as EffectContext;
  return { ctx, returned, deleted, installs, offered, source };
}

function effectFor(timing: EffectTiming, source: CardSource, key: string) {
  const module = getEffectModule(CARD_ID);
  expect(module).toBeDefined();
  const effect = module!.effectsForTiming(timing, source).find((e) => e.effectKey === `${CARD_ID}/${key}`);
  expect(effect).toBeDefined();
  return effect!;
}

const RETURN_KEY = "return-opponent-stacked-cards";
const DELETE_KEY = "delete-on-effect-adds-to-deck";

describe("BT26-060 evolution and printed keywords", () => {
  it("digivolves from an off-color level 6 card with [Chronomon] in its text for cost 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-078", as: "base" }],
          hand: [{ card: CARD_ID, as: "destroy-mode" }],
          deck: ["BT5-022"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("destroy-mode").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("destroy-mode").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("exposes Security Attack +1, Reboot, and Blocker through the continuous ledger", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "chronomon" }] } });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("chronomon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("chronomon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("chronomon"), "Blocker")).toBe(true);
  });

  it("Succession confers only the topmost face-up level 6 card with Chronomon in its name", async () => {
    const source = makeSource();
    const stack = [
      { instanceId: "lower", cardId: "CHRONOMON", faceUp: true },
      { instanceId: "wrong-level", cardId: "WRONG_LEVEL", faceUp: true },
      { instanceId: "upper", cardId: "CHRONOMON", faceUp: true },
      { instanceId: "hidden", cardId: "CHRONOMON", faceUp: false },
    ];
    const conferStackEffects = vi.fn();
    const ctx = {
      source,
      conferredToPermanentId: undefined,
      game: {
        definitionOf: (card: { cardId: string }) =>
          fakeDef({
            cardId: card.cardId,
            nameEn: card.cardId === "CHRONOMON" ? "Chronomon: Holy Mode" : "Other",
            level: card.cardId === "WRONG_LEVEL" ? 5 : 6,
          }),
      },
      fx: { conferStackEffects },
    } as unknown as EffectContext;
    source.permanent = () => ({ permanentId: SELF_PERMANENT, stack }) as never;
    const effect = getEffectModule(CARD_ID)!
      .effectsForTiming(EffectTiming.None, source)
      .find(({ effectKey }) => effectKey.endsWith("succession-chronomon"))!;

    await effect.resolve(ctx);
    expect(conferStackEffects).toHaveBeenCalledWith(SELF_PERMANENT, "upper", expect.anything());
  });
});

describe("BT26-060 [On Play] / [When Digivolving]: return opponent stacked cards to the deck top", () => {
  it("returns the top five stacked cards, top first", async () => {
    const harness = makeHarness({
      theirs: [{ permanentId: "opp-a", topCard: { cardId: DIGIMON }, stack: stackOf("opp-a", 7) }],
    });

    await effectFor(EffectTiming.OnPlay, harness.source, RETURN_KEY).resolve(harness.ctx);

    expect(harness.returned).toEqual([
      { ids: ["opp-a-s6", "opp-a-s5", "opp-a-s4", "opp-a-s3", "opp-a-s2"], opts: { toTop: true } },
    ]);
  });

  it("returns every stacked card when a Digimon has fewer than five", async () => {
    const harness = makeHarness({
      theirs: [{ permanentId: "opp-a", topCard: { cardId: DIGIMON }, stack: stackOf("opp-a", 2) }],
    });

    await effectFor(EffectTiming.OnPlay, harness.source, RETURN_KEY).resolve(harness.ctx);

    expect(harness.returned).toEqual([{ ids: ["opp-a-s1", "opp-a-s0"], opts: { toTop: true } }]);
  });

  it("takes every eligible Digimon without a prompt when three or fewer qualify", async () => {
    const harness = makeHarness({
      theirs: [
        { permanentId: "opp-a", topCard: { cardId: DIGIMON }, stack: stackOf("opp-a", 1) },
        { permanentId: "opp-b", topCard: { cardId: DIGIMON }, stack: stackOf("opp-b", 1) },
        { permanentId: "opp-empty", topCard: { cardId: DIGIMON } },
        { permanentId: "opp-tamer", topCard: { cardId: TAMER }, stack: stackOf("opp-tamer", 3) },
        { permanentId: "opp-breeding", topCard: { cardId: DIGIMON }, stack: stackOf("opp-b2", 3), inBreeding: true },
      ],
    });

    await effectFor(EffectTiming.OnPlay, harness.source, RETURN_KEY).resolve(harness.ctx);

    expect(harness.offered).toEqual([]);
    expect(harness.returned.map((r) => r.ids)).toEqual([["opp-a-s0"], ["opp-b-s0"]]);
  });

  it("asks the controller to pick exactly three when more qualify", async () => {
    const harness = makeHarness({
      theirs: ["a", "b", "c", "d"].map((k) => ({
        permanentId: `opp-${k}`,
        topCard: { cardId: DIGIMON },
        stack: stackOf(`opp-${k}`, 1),
      })),
      pick: (candidates) => candidates.slice(0, 3),
    });

    await effectFor(EffectTiming.WhenDigivolving, harness.source, RETURN_KEY).resolve(harness.ctx);

    expect(harness.offered).toEqual([["opp-a", "opp-b", "opp-c", "opp-d"]]);
    expect(harness.returned).toHaveLength(3);
  });

  it("lets the activating player order the returned cards (KB Q7080)", async () => {
    const harness = makeHarness({
      theirs: [{ permanentId: "opp-a", topCard: { cardId: DIGIMON }, stack: stackOf("opp-a", 3) }],
      order: (candidates) => [...candidates].reverse(),
    });

    await effectFor(EffectTiming.OnPlay, harness.source, RETURN_KEY).resolve(harness.ctx);

    expect(harness.returned).toEqual([{ ids: ["opp-a-s0", "opp-a-s1", "opp-a-s2"], opts: { toTop: true } }]);
  });

  it("does nothing when no opponent Digimon has stacked cards", async () => {
    const harness = makeHarness({ theirs: [{ permanentId: "opp-empty", topCard: { cardId: DIGIMON } }] });

    await effectFor(EffectTiming.OnPlay, harness.source, RETURN_KEY).resolve(harness.ctx);

    expect(harness.returned).toEqual([]);
  });
});

describe("BT26-060 [All Turns] [Once Per Turn]: delete on your own deck adds", () => {
  async function install(harness: ReturnType<typeof makeHarness>): Promise<SubTriggerInstall> {
    await effectFor(EffectTiming.None, harness.source, DELETE_KEY).resolve(harness.ctx);
    expect(harness.installs).toHaveLength(1);
    return harness.installs[0]!;
  }

  it("installs a once-per-turn whenEffectAddsToDeck watcher", async () => {
    const sub = await install(makeHarness({}));

    expect(sub.event).toBe("whenEffectAddsToDeck");
    expect(sub.sourcePermanentId).toBe(SELF_PERMANENT);
    expect(sub.oncePerTurnKey).toBe(`chronomon-top/${CARD_ID}/${DELETE_KEY}`);
  });

  it("matches a deck add on either side (KB Q7086) but not an unrelated firing", async () => {
    const sub = await install(makeHarness({}));

    expect(sub.matches!(makeHarness({ trigger: { effectAddedToDeckSeat: 0, effectAddedToDeckBySeat: 0 } }).ctx)).toBe(
      true,
    );
    expect(sub.matches!(makeHarness({ trigger: { effectAddedToDeckSeat: 1, effectAddedToDeckBySeat: 0 } }).ctx)).toBe(
      true,
    );
    expect(sub.matches!(makeHarness({ trigger: { effectAddedToDeckSeat: 0, effectAddedToDeckBySeat: 1 } }).ctx)).toBe(
      false,
    );
    expect(sub.matches!(makeHarness({}).ctx)).toBe(false);
  });

  it("deletes the chosen opponent Digimon and honours a decline", async () => {
    const accepted = makeHarness({ theirs: [{ permanentId: "opp-a", topCard: { cardId: DIGIMON } }] });
    await (await install(accepted)).run(accepted.ctx);
    expect(accepted.deleted).toEqual([["opp-a"]]);

    const declined = makeHarness({
      theirs: [{ permanentId: "opp-a", topCard: { cardId: DIGIMON } }],
      pick: () => [],
    });
    await (await install(declined)).run(declined.ctx);
    expect(declined.deleted).toEqual([]);
  });
});
