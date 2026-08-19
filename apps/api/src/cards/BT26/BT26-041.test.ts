import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectTiming, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./BT26-041.js";

// BT26-041 (Hudiemon, BT26): "[On Play] [When Digivolving] Add your top security card to the
// hand and <Recovery +1> Then, you may suspend 1 Digimon."
//
// FAILS-WHEN-REVERTED: dropping the empty-security guard calls securityToHand on an empty
// stack; dropping <Recovery +1> or reordering it after the suspend breaks the asserted call
// order; making the suspend mandatory ignores a declined choice.

const CARD_ID = "BT26-041";

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
    instanceId: "hudiemon-top",
    cardId: CARD_ID,
    ownerSeat: 0 as Seat,
    definition: fakeDef({ cardId: CARD_ID }),
    permanent: () => ({ permanentId: "hudiemon" }) as never,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

function makeHarness(options: {
  security?: unknown[];
  mine?: { permanentId: string; topCard?: { cardId: string }; inBreeding?: boolean }[];
  theirs?: { permanentId: string; topCard?: { cardId: string }; inBreeding?: boolean }[];
  pick?: (candidates: string[]) => string[];
}) {
  const players = [
    { seat: 0 as Seat, security: options.security ?? [{ instanceId: "sec-1" }], battleArea: options.mine ?? [] },
    { seat: 1 as Seat, security: [], battleArea: options.theirs ?? [] },
  ];

  const game: GameAccess = {
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    definitionOf: (card: { cardId: string }) =>
      fakeDef({ kinds: (card.cardId === TAMER ? [CardKind.Tamer] : [CardKind.Digimon]) as never }),
  } as unknown as GameAccess;

  const calls: string[] = [];
  const suspended: string[][] = [];
  const fx = {
    securityToHand: vi.fn(async (seat: Seat, n: number, opts?: { fromTop?: boolean }) => {
      calls.push(`securityToHand:${seat}:${n}:${opts?.fromTop === true}`);
      return [];
    }),
    recoverToSecurity: vi.fn(async (seat: Seat, n: number) => {
      calls.push(`recoverToSecurity:${seat}:${n}`);
      return [];
    }),
    suspend: vi.fn(async (ids: string[]) => {
      calls.push(`suspend:${ids.join(",")}`);
      suspended.push(ids);
      return ids;
    }),
  } as unknown as Primitives;

  const offered: string[][] = [];
  const ask = {
    chooseTargets: vi.fn(async (_ctx: unknown, opts: { candidates: string[] }) => {
      offered.push(opts.candidates);
      return options.pick ? options.pick(opts.candidates) : [opts.candidates[0]!];
    }),
  } as unknown as EffectContext["ask"];

  const source = makeSource();
  const ctx = { source, trigger: {}, game, fx, ask } as unknown as EffectContext;
  return { ctx, calls, suspended, offered, source };
}

function effectFor(timing: EffectTiming, source: CardSource, key: string) {
  const module = getEffectModule(CARD_ID);
  expect(module).toBeDefined();
  const effect = module!.effectsForTiming(timing, source).find((e) => e.effectKey === `${CARD_ID}/${key}`);
  expect(effect).toBeDefined();
  return effect!;
}

const ON_PLAY_KEY = "on-play-security-to-hand-recover-suspend";
const DIGIVOLVING_KEY = "when-digivolving-security-to-hand-recover-suspend";

describe("BT26-041 [On Play] / [When Digivolving]: security to hand, recover, then optional suspend", () => {
  it("adds the top security card, recovers 1, then suspends the chosen Digimon in order", async () => {
    const harness = makeHarness({
      theirs: [{ permanentId: "opp-digimon", topCard: { cardId: DIGIMON } }],
    });

    await effectFor(EffectTiming.OnPlay, harness.source, ON_PLAY_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual(["securityToHand:0:1:true", "recoverToSecurity:0:1", "suspend:opp-digimon"]);
  });

  it("still recovers when the security stack is empty and never draws from it", async () => {
    const harness = makeHarness({
      security: [],
      theirs: [{ permanentId: "opp-digimon", topCard: { cardId: DIGIMON } }],
    });

    await effectFor(EffectTiming.OnPlay, harness.source, ON_PLAY_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual(["recoverToSecurity:0:1", "suspend:opp-digimon"]);
  });

  it("suspends nothing when the controller declines", async () => {
    const harness = makeHarness({
      theirs: [{ permanentId: "opp-digimon", topCard: { cardId: DIGIMON } }],
      pick: () => [],
    });

    await effectFor(EffectTiming.OnPlay, harness.source, ON_PLAY_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual(["securityToHand:0:1:true", "recoverToSecurity:0:1"]);
    expect(harness.suspended).toEqual([]);
  });

  it("offers Digimon from both seats and skips Tamers and breeding-area Digimon", async () => {
    const harness = makeHarness({
      mine: [
        { permanentId: "my-digimon", topCard: { cardId: DIGIMON } },
        { permanentId: "my-tamer", topCard: { cardId: TAMER } },
        { permanentId: "my-egg", topCard: { cardId: DIGIMON }, inBreeding: true },
      ],
      theirs: [{ permanentId: "opp-digimon", topCard: { cardId: DIGIMON } }],
      pick: () => [],
    });

    await effectFor(EffectTiming.OnPlay, harness.source, ON_PLAY_KEY).resolve(harness.ctx);

    expect(harness.offered).toEqual([["my-digimon", "opp-digimon"]]);
  });

  it("skips the suspend prompt entirely when no Digimon is on the battle area", async () => {
    const harness = makeHarness({});

    await effectFor(EffectTiming.OnPlay, harness.source, ON_PLAY_KEY).resolve(harness.ctx);

    expect(harness.offered).toEqual([]);
    expect(harness.calls).toEqual(["securityToHand:0:1:true", "recoverToSecurity:0:1"]);
  });

  it("runs the same clause from the [When Digivolving] window", async () => {
    const harness = makeHarness({
      theirs: [{ permanentId: "opp-digimon", topCard: { cardId: DIGIMON } }],
    });

    await effectFor(EffectTiming.WhenDigivolving, harness.source, DIGIVOLVING_KEY).resolve(harness.ctx);

    expect(harness.calls).toEqual(["securityToHand:0:1:true", "recoverToSecurity:0:1", "suspend:opp-digimon"]);
  });
});
