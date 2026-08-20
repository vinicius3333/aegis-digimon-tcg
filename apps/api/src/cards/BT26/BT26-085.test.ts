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
import "./BT26-085.js";

// BT26-085 (Giant Slayer, BT26):
//   "[On Play] Until your opponent's turn ends, your opponent's effects can't reduce this
//    Digimon's DP or trash its stacked cards."
//   "[All Turns] When this Digimon would leave the battle area, by digivolving it into
//    [Chronomon: Destroy Mode] in the hand or trash without paying the cost, it doesn't leave."
//
// FAILS-WHEN-REVERTED: dropping `byOpponentEffectsOnly` also blocks the controller's own DP
// reduction (the restrict call is asserted exactly); a prevention that returns true without a
// successful digivolve keeps the Digimon alive for free; guarding another permanent's
// departure would let it shield the rest of the board.

const CARD_ID = "BT26-085";
const SELF_PERMANENT = "giant-slayer";
const DESTROY_MODE = "destroy-mode";
const FILLER = "filler";

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
  if (cardId === DESTROY_MODE) return fakeDef({ cardId, nameEn: "Chronomon: Destroy Mode" });
  return fakeDef({ cardId, nameEn: "Filler" });
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "giant-slayer-top",
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
  trash?: { instanceId: string; cardId: string }[];
  accept?: boolean;
  digivolveSucceeds?: boolean;
  withStackTrashLock?: boolean;
}) {
  const players = [
    { seat: 0 as Seat, hand: options.hand ?? [], trash: options.trash ?? [], battleArea: [] },
    { seat: 1 as Seat, hand: [], trash: [], battleArea: [] },
  ];

  const game: GameAccess = {
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    definitionOf: (card: { cardId: string }) => definitionFor(card.cardId),
  } as unknown as GameAccess;

  const restricts: unknown[] = [];
  const locks: unknown[] = [];
  const digivolves: { target: string; instance: string; opts: unknown }[] = [];
  const replacements: ReplacementInstall[] = [];
  const fx = {
    restrict: vi.fn<(...args: any[]) => any>((permanentId: string, restriction: string, duration: EffectDuration, opts?: unknown) => {
      restricts.push({ permanentId, restriction, duration, opts });
    }),
    ...(options.withStackTrashLock === false
      ? {}
      : {
          stackTrashLock: vi.fn<(...args: any[]) => any>((permanentId: string, duration: EffectDuration) => {
            locks.push({ permanentId, duration });
          }),
        }),
    digivolveFromInstance: vi.fn<(...args: any[]) => any>(async (target: string, instance: string, opts: unknown) => {
      digivolves.push({ target, instance, opts });
      return options.digivolveSucceeds === false ? undefined : ({ permanentId: target } as never);
    }),
    subscribeReplacement: vi.fn<(...args: any[]) => any>((sub: ReplacementInstall) => {
      replacements.push(sub);
      return replacements.length;
    }),
  } as unknown as Primitives;

  const offered: string[][] = [];
  const ask = {
    optional: vi.fn<(...args: any[]) => any>(async () => options.accept ?? true),
    selectCards: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => {
      offered.push(opts.candidates);
      return [opts.candidates[0]!];
    }),
  } as unknown as EffectContext["ask"];

  const source = makeSource();
  const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
  return { ctx, restricts, locks, digivolves, replacements, offered, source };
}

function effectFor(timing: EffectTiming, source: CardSource, key: string) {
  const module = getEffectModule(CARD_ID);
  expect(module).toBeDefined();
  const effect = module!.effectsForTiming(timing, source).find((e) => e.effectKey === `${CARD_ID}/${key}`);
  expect(effect).toBeDefined();
  return effect!;
}

const ON_PLAY_KEY = "on-play-dp-and-stack-protection";
const PREVENT_KEY = "prevent-leave-digivolve-into-destroy-mode";

describe("BT26-085 [On Play]: protect this Digimon's DP and stacked cards", () => {
  it("makes it DP-immune to opponent effects and locks its stack until the opponent's turn ends", async () => {
    const harness = makeHarness({});

    await effectFor(EffectTiming.OnPlay, harness.source, ON_PLAY_KEY).resolve(harness.ctx);

    expect(harness.restricts).toEqual([
      {
        permanentId: SELF_PERMANENT,
        restriction: "dpImmune",
        duration: EffectDuration.UntilOpponentTurnEnd,
        opts: { byOpponentEffectsOnly: true },
      },
    ]);
    expect(harness.locks).toEqual([{ permanentId: SELF_PERMANENT, duration: EffectDuration.UntilOpponentTurnEnd }]);
  });

  it("still applies the DP protection when the optional stackTrashLock primitive is absent", async () => {
    const harness = makeHarness({ withStackTrashLock: false });

    await effectFor(EffectTiming.OnPlay, harness.source, ON_PLAY_KEY).resolve(harness.ctx);

    expect(harness.restricts).toHaveLength(1);
  });
});

describe("BT26-085 [All Turns]: stay on the field by digivolving into Chronomon: Destroy Mode", () => {
  async function install(harness: ReturnType<typeof makeHarness>): Promise<ReplacementInstallPrevent> {
    await effectFor(EffectTiming.None, harness.source, PREVENT_KEY).resolve(harness.ctx);
    expect(harness.replacements).toHaveLength(1);
    return harness.replacements[0]! as ReplacementInstallPrevent;
  }

  it("guards only this Digimon's own departure", async () => {
    const harness = makeHarness({});
    const sub = await install(harness);

    expect(sub.event).toBe("wouldLeavePlay");
    expect(sub.protects!(harness.ctx, SELF_PERMANENT)).toBe(true);
    expect(sub.protects!(harness.ctx, "someone-else")).toBe(false);
  });

  it("digivolves for free from hand or trash and prevents the departure", async () => {
    const harness = makeHarness({
      hand: [{ instanceId: "hand-filler", cardId: FILLER }],
      trash: [{ instanceId: "trash-destroy-mode", cardId: DESTROY_MODE }],
    });
    const sub = await install(harness);

    await expect(sub.preventCheck(harness.ctx, SELF_PERMANENT)).resolves.toBe(true);
    expect(harness.digivolves).toEqual([
      { target: SELF_PERMANENT, instance: "trash-destroy-mode", opts: { ignoreRequirements: true } },
    ]);
  });

  it("does not prevent when no copy is available, the player declines, or the digivolve fails", async () => {
    const none = makeHarness({ hand: [{ instanceId: "hand-filler", cardId: FILLER }] });
    await expect((await install(none)).preventCheck(none.ctx, SELF_PERMANENT)).resolves.toBe(false);
    expect(none.digivolves).toEqual([]);

    const declined = makeHarness({
      hand: [{ instanceId: "hand-destroy-mode", cardId: DESTROY_MODE }],
      accept: false,
    });
    await expect((await install(declined)).preventCheck(declined.ctx, SELF_PERMANENT)).resolves.toBe(false);
    expect(declined.digivolves).toEqual([]);

    const failed = makeHarness({
      hand: [{ instanceId: "hand-destroy-mode", cardId: DESTROY_MODE }],
      digivolveSucceeds: false,
    });
    await expect((await install(failed)).preventCheck(failed.ctx, SELF_PERMANENT)).resolves.toBe(false);
    expect(failed.digivolves).toHaveLength(1);
  });

  it("asks which copy to use when hand and trash both hold one", async () => {
    const harness = makeHarness({
      hand: [{ instanceId: "hand-destroy-mode", cardId: DESTROY_MODE }],
      trash: [{ instanceId: "trash-destroy-mode", cardId: DESTROY_MODE }],
    });
    const sub = await install(harness);

    await sub.preventCheck(harness.ctx, SELF_PERMANENT);

    expect(harness.offered).toEqual([["hand-destroy-mode", "trash-destroy-mode"]]);
  });
});
