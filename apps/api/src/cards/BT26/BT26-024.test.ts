import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import "./BT26-024.js";

// BT26-024 (Tinkermon, BT26): "[Your Turn] When any of your other Digimon with the
// [Vegetation], [Fairy] or [WG] trait are played, this Digimon may digivolve into a Digimon
// card with the [Vegetation], [Fairy] or [WG] trait in the hand without paying the cost."
//
// FAILS-WHEN-REVERTED: dropping the `subjectId === selfPermanentId` guard makes the watcher
// fire on its own play; dropping the controller check makes an opponent's play trigger it;
// dropping the trait filter accepts any Digimon; passing `payCost: true` would make the
// digivolution cost memory (the assertion pins the exact options object).

const CARD_ID = "BT26-024";
const SELF_PERMANENT = "tinkermon";

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
  if (cardId === TAMER) return fakeDef({ cardId, kinds: [CardKind.Tamer] as never });
  if (cardId === TRAIT_DIGIMON) return fakeDef({ cardId, types: ["Fairy", "WG"] });
  return fakeDef({ cardId, types: ["Machine"] });
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "tinkermon-top",
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

interface Harness {
  ctx: EffectContext;
  installs: SubTriggerInstall[];
  digivolves: { target: string; instance: string; opts: unknown }[];
  source: CardSource;
}

function makeHarness(options: {
  hand?: { instanceId: string; cardId: string }[];
  permanents?: Record<string, { controllerSeat: Seat; topCard?: { cardId: string }; inBreeding?: boolean }>;
  accept?: boolean;
  pick?: (candidates: string[]) => string[];
  source?: CardSource;
  trigger?: Record<string, unknown>;
}): Harness {
  const permanents: Record<string, unknown> = {
    [SELF_PERMANENT]: { permanentId: SELF_PERMANENT, controllerSeat: 0 as Seat },
    ...Object.fromEntries(Object.entries(options.permanents ?? {}).map(([id, p]) => [id, { permanentId: id, ...p }])),
  };

  const players = [
    { seat: 0 as Seat, hand: options.hand ?? [], battleArea: [] },
    { seat: 1 as Seat, hand: [], battleArea: [] },
  ];

  const game: GameAccess = {
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => permanents[id] as never,
    definitionOf: (card: { cardId: string }) => definitionFor(card.cardId),
  } as unknown as GameAccess;

  const installs: SubTriggerInstall[] = [];
  const digivolves: { target: string; instance: string; opts: unknown }[] = [];
  const fx = {
    subscribeSubTrigger: vi.fn((sub: SubTriggerInstall) => {
      installs.push(sub);
      return installs.length;
    }),
    digivolveFromInstance: vi.fn(async (target: string, instance: string, opts: unknown) => {
      digivolves.push({ target, instance, opts });
      return undefined;
    }),
  } as unknown as Primitives;

  const ask = {
    optional: vi.fn(async () => options.accept ?? true),
    selectCards: vi.fn(async (_ctx: unknown, opts: { candidates: string[] }) =>
      options.pick ? options.pick(opts.candidates) : [opts.candidates[0]!],
    ),
  } as unknown as EffectContext["ask"];

  const source = options.source ?? makeSource();
  const ctx = { source, trigger: options.trigger ?? {}, game, fx, ask } as unknown as EffectContext;
  return { ctx, installs, digivolves, source };
}

async function install(harness: Harness): Promise<SubTriggerInstall> {
  const module = getEffectModule(CARD_ID);
  const effect = module!
    .effectsForTiming(EffectTiming.None, harness.source)
    .find((e) => e.effectKey === `${CARD_ID}/reactive-alt-digivolve-on-ally-played`);
  expect(effect).toBeDefined();
  await effect!.resolve(harness.ctx);
  expect(harness.installs).toHaveLength(1);
  return harness.installs[0]!;
}

function matchContext(subject: string | undefined, source = makeSource()): EffectContext {
  const harness = makeHarness({
    permanents: {
      [TRAIT_DIGIMON]: { controllerSeat: 0 as Seat, topCard: { cardId: TRAIT_DIGIMON } },
      [PLAIN_DIGIMON]: { controllerSeat: 0 as Seat, topCard: { cardId: PLAIN_DIGIMON } },
      "opp-trait-digimon": { controllerSeat: 1 as Seat, topCard: { cardId: TRAIT_DIGIMON } },
      [TAMER]: { controllerSeat: 0 as Seat, topCard: { cardId: TAMER } },
    },
    source,
    trigger: subject === undefined ? {} : { subjectPermanentId: subject },
  });
  return harness.ctx;
}

describe("BT26-024 [Your Turn]: reactive free digivolve when another trait Digimon is played", () => {
  it("installs one whenPlayed watcher anchored to this permanent", async () => {
    const harness = makeHarness({});
    const sub = await install(harness);

    expect(sub.event).toBe("whenPlayed");
    expect(sub.sourcePermanentId).toBe(SELF_PERMANENT);
    expect(sub.once).toBe(false);
  });

  it("matches only an allied, non-self Digimon carrying one of the printed traits", async () => {
    const sub = await install(makeHarness({}));

    expect(sub.matches!(matchContext(TRAIT_DIGIMON))).toBe(true);
    expect(sub.matches!(matchContext(SELF_PERMANENT))).toBe(false);
    expect(sub.matches!(matchContext(PLAIN_DIGIMON))).toBe(false);
    expect(sub.matches!(matchContext("opp-trait-digimon"))).toBe(false);
    expect(sub.matches!(matchContext(TAMER))).toBe(false);
    expect(sub.matches!(matchContext(undefined))).toBe(false);
  });

  it("does not match outside its controller's turn or once off the battle area", async () => {
    const sub = await install(makeHarness({}));

    const offTurn = makeSource({ isOwnersTurn: () => false });
    const offField = makeSource({ isOnBattleArea: () => false });

    expect(sub.matches!(matchContext(TRAIT_DIGIMON, offTurn))).toBe(false);
    expect(sub.matches!(matchContext(TRAIT_DIGIMON, offField))).toBe(false);
  });

  it("digivolves into a chosen trait Digimon from hand without paying the cost", async () => {
    const harness = makeHarness({
      hand: [
        { instanceId: "hand-trait", cardId: TRAIT_DIGIMON },
        { instanceId: "hand-plain", cardId: PLAIN_DIGIMON },
        { instanceId: "hand-tamer", cardId: TAMER },
      ],
    });
    const sub = await install(harness);

    await sub.run(harness.ctx);

    expect(harness.digivolves).toEqual([
      { target: SELF_PERMANENT, instance: "hand-trait", opts: { ignoreRequirements: true } },
    ]);
  });

  it("does nothing when the controller declines or the hand holds no eligible card", async () => {
    const declined = makeHarness({
      hand: [{ instanceId: "hand-trait", cardId: TRAIT_DIGIMON }],
      accept: false,
    });
    await (await install(declined)).run(declined.ctx);
    expect(declined.digivolves).toEqual([]);

    const empty = makeHarness({ hand: [{ instanceId: "hand-plain", cardId: PLAIN_DIGIMON }] });
    await (await install(empty)).run(empty.ctx);
    expect(empty.digivolves).toEqual([]);
  });
});
