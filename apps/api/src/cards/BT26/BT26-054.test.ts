import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import "./BT26-054.js";

// BT26-054 (Andromon, BT26):
//   "[On Play] [When Digivolving] You may play 1 [CS] trait Tamer card from your hand without
//    paying the cost. This effect can't play cards with the same name as any of your Tamers."
//   "[All Turns] [Once Per Turn] When effects place [CS] trait Digimon cards in this Digimon's
//    digivolution cards, this Digimon may digivolve into a [CS] trait Digimon card in the hand
//    without paying the cost."
//
// FAILS-WHEN-REVERTED: dropping the same-name exclusion offers a duplicate Tamer; dropping the
// [CS] filter offers any Tamer; passing payCost: true charges memory; dropping the
// addedDigivolutionCardInstanceIds check fires the watcher on a non-[CS] placement; dropping
// the subject check fires it for another permanent's stack.

const CARD_ID = "BT26-054";
const SELF_PERMANENT = "andromon";

const CS_TAMER = "cs-tamer";
const CS_TAMER_DUPLICATE = "cs-tamer-duplicate";
const PLAIN_TAMER = "plain-tamer";
const CS_DIGIMON = "cs-digimon";
const PLAIN_DIGIMON = "plain-digimon";

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
  switch (cardId) {
    case CS_TAMER:
      return fakeDef({ cardId, nameEn: "Thomas", kinds: [CardKind.Tamer] as never, types: ["CS"] });
    case CS_TAMER_DUPLICATE:
      return fakeDef({ cardId, nameEn: "Marcus", kinds: [CardKind.Tamer] as never, types: ["CS"] });
    case PLAIN_TAMER:
      return fakeDef({ cardId, nameEn: "Rhythm", kinds: [CardKind.Tamer] as never, types: ["Xros Heart"] });
    case CS_DIGIMON:
      return fakeDef({ cardId, nameEn: "HiAndromon", types: ["CS"] });
    default:
      return fakeDef({ cardId, nameEn: "Filler", types: ["Machine"] });
  }
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "andromon-top",
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

function makeHarness(options: {
  hand?: { instanceId: string; cardId: string }[];
  mine?: { permanentId: string; topCard?: { cardId: string } }[];
  stack?: { instanceId: string; cardId: string }[];
  accept?: boolean;
  pick?: (candidates: string[]) => string[];
  trigger?: Record<string, unknown>;
  source?: CardSource;
}) {
  const selfPermanent = {
    permanentId: SELF_PERMANENT,
    controllerSeat: 0 as Seat,
    stack: options.stack ?? [],
  };
  const permanents: Record<string, unknown> = { [SELF_PERMANENT]: selfPermanent, other: { permanentId: "other" } };

  const players = [
    { seat: 0 as Seat, hand: options.hand ?? [], battleArea: options.mine ?? [] },
    { seat: 1 as Seat, hand: [], battleArea: [] },
  ];

  const game: GameAccess = {
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => permanents[id] as never,
    definitionOf: (card: { cardId: string }) => definitionFor(card.cardId),
  } as unknown as GameAccess;

  const played: { ids: string[]; opts: unknown }[] = [];
  const digivolves: { target: string; instance: string; opts: unknown }[] = [];
  const installs: SubTriggerInstall[] = [];
  const fx = {
    playFromHand: vi.fn(async (ids: string[], opts: unknown) => {
      played.push({ ids, opts });
      return [];
    }),
    digivolveFromInstance: vi.fn(async (target: string, instance: string, opts: unknown) => {
      digivolves.push({ target, instance, opts });
      return undefined;
    }),
    subscribeSubTrigger: vi.fn((sub: SubTriggerInstall) => {
      installs.push(sub);
      return installs.length;
    }),
  } as unknown as Primitives;

  const offered: string[][] = [];
  const ask = {
    optional: vi.fn(async () => options.accept ?? true),
    selectCards: vi.fn(async (_ctx: unknown, opts: { candidates: string[] }) => {
      offered.push(opts.candidates);
      return options.pick ? options.pick(opts.candidates) : [opts.candidates[0]!];
    }),
  } as unknown as EffectContext["ask"];

  const source = options.source ?? makeSource();
  const ctx = { source, trigger: options.trigger ?? {}, game, fx, ask } as unknown as EffectContext;
  return { ctx, played, digivolves, installs, offered, source };
}

function effectFor(timing: EffectTiming, source: CardSource, key: string) {
  const module = getEffectModule(CARD_ID);
  expect(module).toBeDefined();
  const effect = module!.effectsForTiming(timing, source).find((e) => e.effectKey === `${CARD_ID}/${key}`);
  expect(effect).toBeDefined();
  return effect!;
}

const PLAY_TAMER_KEY = "on-play-play-cs-tamer";
const WATCHER_KEY = "reactive-alt-digivolve-on-cs-stack-add";

describe("BT26-054 [On Play] / [When Digivolving]: play a [CS] Tamer for free", () => {
  it("plays the chosen [CS] Tamer without paying the cost", async () => {
    const harness = makeHarness({ hand: [{ instanceId: "hand-cs-tamer", cardId: CS_TAMER }] });

    await effectFor(EffectTiming.OnPlay, harness.source, PLAY_TAMER_KEY).resolve(harness.ctx);

    expect(harness.played).toEqual([{ ids: ["hand-cs-tamer"], opts: { payCost: false } }]);
  });

  it("excludes non-[CS] Tamers, Digimon, and any Tamer sharing a name with one already in play", async () => {
    const harness = makeHarness({
      hand: [
        { instanceId: "hand-cs-tamer", cardId: CS_TAMER },
        { instanceId: "hand-duplicate", cardId: CS_TAMER_DUPLICATE },
        { instanceId: "hand-plain-tamer", cardId: PLAIN_TAMER },
        { instanceId: "hand-cs-digimon", cardId: CS_DIGIMON },
      ],
      mine: [{ permanentId: "my-marcus", topCard: { cardId: CS_TAMER_DUPLICATE } }],
      pick: () => [],
    });

    await effectFor(EffectTiming.OnPlay, harness.source, PLAY_TAMER_KEY).resolve(harness.ctx);

    expect(harness.offered).toEqual([["hand-cs-tamer"]]);
    expect(harness.played).toEqual([]);
  });

  it("cannot activate with no eligible Tamer in hand", () => {
    const harness = makeHarness({ hand: [{ instanceId: "hand-plain-tamer", cardId: PLAIN_TAMER }] });

    expect(effectFor(EffectTiming.OnPlay, harness.source, PLAY_TAMER_KEY).canActivate(harness.ctx)).toBe(false);
  });

  it("offers the same clause from the [When Digivolving] window", async () => {
    const harness = makeHarness({ hand: [{ instanceId: "hand-cs-tamer", cardId: CS_TAMER }] });

    await effectFor(EffectTiming.WhenDigivolving, harness.source, "when-digivolving-play-cs-tamer").resolve(
      harness.ctx,
    );

    expect(harness.played).toEqual([{ ids: ["hand-cs-tamer"], opts: { payCost: false } }]);
  });
});

describe("BT26-054 [All Turns] [Once Per Turn]: free digivolve when [CS] Digimon cards join the stack", () => {
  async function install(harness: ReturnType<typeof makeHarness>): Promise<SubTriggerInstall> {
    await effectFor(EffectTiming.None, harness.source, WATCHER_KEY).resolve(harness.ctx);
    expect(harness.installs).toHaveLength(1);
    return harness.installs[0]!;
  }

  function stackContext(options: {
    stack: { instanceId: string; cardId: string }[];
    added: string[];
    subject?: string;
  }) {
    return makeHarness({
      stack: options.stack,
      trigger: {
        subjectPermanentId: options.subject ?? SELF_PERMANENT,
        addedDigivolutionCardInstanceIds: options.added,
      },
    }).ctx;
  }

  it("installs a once-per-turn onAddDigivolutionCards watcher anchored to this permanent", async () => {
    const sub = await install(makeHarness({}));

    expect(sub.event).toBe("onAddDigivolutionCards");
    expect(sub.sourcePermanentId).toBe(SELF_PERMANENT);
    expect(sub.oncePerTurnKey).toBe(`${CARD_ID}/${WATCHER_KEY}`);
    expect(sub.oncePerTiming).toBe(true);
  });

  it("matches only a placement of [CS] Digimon cards into this Digimon's own stack", async () => {
    const sub = await install(makeHarness({}));
    const csCard = { instanceId: "stack-cs", cardId: CS_DIGIMON };
    const plainCard = { instanceId: "stack-plain", cardId: PLAIN_DIGIMON };

    expect(sub.matches!(stackContext({ stack: [csCard], added: ["stack-cs"] }))).toBe(true);
    expect(sub.matches!(stackContext({ stack: [plainCard], added: ["stack-plain"] }))).toBe(false);
    // A [CS] card already in the stack, but not part of this placement, does not re-trigger.
    expect(sub.matches!(stackContext({ stack: [csCard, plainCard], added: ["stack-plain"] }))).toBe(false);
    expect(sub.matches!(stackContext({ stack: [csCard], added: [] }))).toBe(false);
    expect(sub.matches!(stackContext({ stack: [csCard], added: ["stack-cs"], subject: "other" }))).toBe(false);
  });

  it("digivolves into a chosen [CS] Digimon from hand without paying the cost", async () => {
    const harness = makeHarness({
      hand: [
        { instanceId: "hand-cs-digimon", cardId: CS_DIGIMON },
        { instanceId: "hand-plain-digimon", cardId: PLAIN_DIGIMON },
      ],
    });
    const sub = await install(harness);

    await sub.run(harness.ctx);

    expect(harness.offered).toEqual([["hand-cs-digimon"]]);
    expect(harness.digivolves).toEqual([
      { target: SELF_PERMANENT, instance: "hand-cs-digimon", opts: { ignoreRequirements: true } },
    ]);
  });

  it("does nothing when declined or with no [CS] Digimon in hand", async () => {
    const declined = makeHarness({ hand: [{ instanceId: "hand-cs-digimon", cardId: CS_DIGIMON }], accept: false });
    await (await install(declined)).run(declined.ctx);
    expect(declined.digivolves).toEqual([]);

    const empty = makeHarness({ hand: [{ instanceId: "hand-plain-digimon", cardId: PLAIN_DIGIMON }] });
    await (await install(empty)).run(empty.ctx);
    expect(empty.digivolves).toEqual([]);
  });
});
