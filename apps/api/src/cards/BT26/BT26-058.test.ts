import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectDuration, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type {
  EffectContext,
  GameAccess,
  Primitives,
  ReplacementInstall,
  ReplacementInstallPrevent,
} from "../../engine/effects/EffectContext.js";
import "./BT26-058.js";

// BT26-058 (HiAndromon, BT26):
//   "[When Digivolving] [When Attacking] [Once Per Turn] Your opponent's Digimon effects don't
//    affect 1 of your [CS] trait Digimon until their turn ends."
//   "[All Turns] When any of your [CS] trait Digimon would leave the battle area, by placing
//    this Digimon's top stacked card as its bottom digivolution card, they don't leave."
//
// FAILS-WHEN-REVERTED: giving the two windows distinct effectKeys splits the printed
// [Once Per Turn] into two budgets; dropping `byOpponentEffectsOnly`/`fromSourceKind` widens
// the protection (the grant is asserted exactly); the replacement must protect only the
// controller's own [CS] Digimon, must decline when the stack is empty, and must pay with the
// TOP stacked card.

const CARD_ID = "BT26-058";
const SELF_PERMANENT = "hiandromon";

const CS_DIGIMON = "cs-digimon";
const PLAIN_DIGIMON = "plain-digimon";
const CS_TAMER = "cs-tamer";

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
  if (cardId === CS_TAMER) return fakeDef({ cardId, kinds: [CardKind.Tamer] as never, types: ["CS"] });
  if (cardId === CS_DIGIMON) return fakeDef({ cardId, types: ["CS"] });
  return fakeDef({ cardId, types: ["Machine"] });
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "hiandromon-top",
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
  controllerSeat?: Seat;
  topCard?: { cardId: string };
  inBreeding?: boolean;
  stack?: { instanceId: string; cardId: string }[];
}

function makeHarness(options: {
  mine?: Perm[];
  theirs?: Perm[];
  selfStack?: { instanceId: string; cardId: string }[];
  accept?: boolean;
  pick?: (candidates: string[]) => string[];
}) {
  const mine = options.mine ?? [];
  const theirs = options.theirs ?? [];
  const selfPermanent: Perm = {
    permanentId: SELF_PERMANENT,
    controllerSeat: 0 as Seat,
    stack: options.selfStack ?? [],
  };

  const permanents = new Map<string, Perm>([[SELF_PERMANENT, selfPermanent]]);
  for (const p of mine) permanents.set(p.permanentId, { controllerSeat: 0 as Seat, ...p });
  for (const p of theirs) permanents.set(p.permanentId, { controllerSeat: 1 as Seat, ...p });

  const players = [
    { seat: 0 as Seat, battleArea: mine },
    { seat: 1 as Seat, battleArea: theirs },
  ];

  const game: GameAccess = {
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => permanents.get(id) as never,
    definitionOf: (card: { cardId: string }) => definitionFor(card.cardId),
  } as unknown as GameAccess;

  const restricts: unknown[] = [];
  const placements: { target: string; ids: string[] }[] = [];
  const replacements: ReplacementInstall[] = [];
  const fx = {
    restrict: vi.fn<(...args: any[]) => any>((permanentId: string, restriction: string, duration: EffectDuration, opts?: unknown) => {
      restricts.push({ permanentId, restriction, duration, opts });
    }),
    placeUnder: vi.fn<(...args: any[]) => any>(async (target: string, ids: string[]) => {
      placements.push({ target, ids });
      return ids.map((instanceId) => ({ instanceId }));
    }),
    subscribeReplacement: vi.fn<(...args: any[]) => any>((sub: ReplacementInstall) => {
      replacements.push(sub);
      return replacements.length;
    }),
  } as unknown as Primitives;

  const offered: string[][] = [];
  const ask = {
    optional: vi.fn<(...args: any[]) => any>(async () => options.accept ?? true),
    chooseTargets: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => {
      offered.push(opts.candidates);
      return options.pick ? options.pick(opts.candidates) : [opts.candidates[0]!];
    }),
  } as unknown as EffectContext["ask"];

  const source = makeSource();
  const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
  return { ctx, restricts, placements, replacements, offered, source };
}

function effectFor(timing: EffectTiming, source: CardSource, key: string) {
  const module = getEffectModule(CARD_ID);
  expect(module).toBeDefined();
  const effect = module!.effectsForTiming(timing, source).find((e) => e.effectKey === `${CARD_ID}/${key}`);
  expect(effect).toBeDefined();
  return effect!;
}

const PROTECT_KEY = "protect-cs-digimon";
const PREVENT_KEY = "prevent-leave-cs-place-stack-at-bottom";

describe("BT26-058 [When Digivolving] / [When Attacking]: shield a [CS] Digimon from opponent Digimon effects", () => {
  it("restricts the chosen [CS] Digimon from being affected by the opponent's Digimon effects", async () => {
    const harness = makeHarness({ mine: [{ permanentId: "my-cs", topCard: { cardId: CS_DIGIMON } }] });

    await effectFor(EffectTiming.WhenDigivolving, harness.source, PROTECT_KEY).resolve(harness.ctx);

    expect(harness.restricts).toEqual([
      {
        permanentId: "my-cs",
        restriction: "beAffected",
        duration: EffectDuration.UntilOpponentTurnEnd,
        opts: { fromSourceKind: ["Digimon"], byOpponentEffectsOnly: true },
      },
    ]);
    // A single candidate needs no prompt.
    expect(harness.offered).toEqual([]);
  });

  it("offers only the controller's own non-breeding [CS] Digimon", async () => {
    const harness = makeHarness({
      mine: [
        { permanentId: "my-cs", topCard: { cardId: CS_DIGIMON } },
        { permanentId: "my-cs-2", topCard: { cardId: CS_DIGIMON } },
        { permanentId: "my-cs-breeding", topCard: { cardId: CS_DIGIMON }, inBreeding: true },
        { permanentId: "my-cs-tamer", topCard: { cardId: CS_TAMER } },
        { permanentId: "my-plain", topCard: { cardId: PLAIN_DIGIMON } },
      ],
      theirs: [{ permanentId: "opp-cs", topCard: { cardId: CS_DIGIMON } }],
    });

    await effectFor(EffectTiming.WhenDigivolving, harness.source, PROTECT_KEY).resolve(harness.ctx);

    expect(harness.offered).toEqual([["my-cs", "my-cs-2"]]);
  });

  it("does nothing when the controller has no [CS] Digimon", async () => {
    const harness = makeHarness({ mine: [{ permanentId: "my-plain", topCard: { cardId: PLAIN_DIGIMON } }] });

    await effectFor(EffectTiming.WhenDigivolving, harness.source, PROTECT_KEY).resolve(harness.ctx);

    expect(harness.restricts).toEqual([]);
  });

  it("shares one [Once Per Turn] budget between the digivolve and attack windows", () => {
    const source = makeSource();
    const digivolving = effectFor(EffectTiming.WhenDigivolving, source, PROTECT_KEY);
    const attacking = effectFor(EffectTiming.OnUseAttack, source, PROTECT_KEY);

    expect(digivolving.effectKey).toBe(attacking.effectKey);
    expect(digivolving.maxPerTurn).toBe(1);
    expect(attacking.maxPerTurn).toBe(1);
  });
});

describe("BT26-058 [All Turns]: keep a [CS] Digimon on the field by rotating a stacked card", () => {
  async function install(harness: ReturnType<typeof makeHarness>): Promise<ReplacementInstall> {
    await effectFor(EffectTiming.None, harness.source, PREVENT_KEY).resolve(harness.ctx);
    expect(harness.replacements).toHaveLength(1);
    return harness.replacements[0]!;
  }

  it("installs a wouldLeavePlay prevention anchored to this permanent", async () => {
    const sub = await install(makeHarness({}));

    expect(sub.event).toBe("wouldLeavePlay");
    expect(sub.mode).toBe("prevent");
    expect(sub.sourcePermanentId).toBe(SELF_PERMANENT);
  });

  it("protects only the controller's own, non-breeding [CS] Digimon", async () => {
    const harness = makeHarness({
      mine: [
        { permanentId: "my-cs", topCard: { cardId: CS_DIGIMON } },
        { permanentId: "my-cs-breeding", topCard: { cardId: CS_DIGIMON }, inBreeding: true },
        { permanentId: "my-cs-tamer", topCard: { cardId: CS_TAMER } },
        { permanentId: "my-plain", topCard: { cardId: PLAIN_DIGIMON } },
      ],
      theirs: [{ permanentId: "opp-cs", topCard: { cardId: CS_DIGIMON } }],
    });
    const sub = await install(harness);
    const { protects } = sub as ReplacementInstallPrevent;
    expect(protects).toBeDefined();

    expect(protects!(harness.ctx, "my-cs")).toBe(true);
    expect(protects!(harness.ctx, "my-cs-breeding")).toBe(false);
    expect(protects!(harness.ctx, "my-cs-tamer")).toBe(false);
    expect(protects!(harness.ctx, "my-plain")).toBe(false);
    expect(protects!(harness.ctx, "opp-cs")).toBe(false);
    expect(protects!(harness.ctx, "missing")).toBe(false);
  });

  it("pays with the TOP stacked card, placing it back as the bottom digivolution card", async () => {
    const harness = makeHarness({
      selfStack: [
        { instanceId: "stack-bottom", cardId: PLAIN_DIGIMON },
        { instanceId: "stack-top", cardId: PLAIN_DIGIMON },
      ],
    });
    const sub = await install(harness);
    const { preventCheck } = sub as ReplacementInstallPrevent;

    await expect(preventCheck(harness.ctx, "my-cs")).resolves.toBe(true);
    expect(harness.placements).toEqual([{ target: SELF_PERMANENT, ids: ["stack-top"] }]);
  });

  it("declines when the stack is empty or the controller refuses to pay", async () => {
    const empty = makeHarness({ selfStack: [] });
    const emptyCheck = (await install(empty)) as ReplacementInstallPrevent;
    await expect(emptyCheck.preventCheck(empty.ctx, "my-cs")).resolves.toBe(false);
    expect(empty.placements).toEqual([]);

    const refused = makeHarness({ selfStack: [{ instanceId: "stack-top", cardId: PLAIN_DIGIMON }], accept: false });
    const refusedCheck = (await install(refused)) as ReplacementInstallPrevent;
    await expect(refusedCheck.preventCheck(refused.ctx, "my-cs")).resolves.toBe(false);
    expect(refused.placements).toEqual([]);
  });
});
