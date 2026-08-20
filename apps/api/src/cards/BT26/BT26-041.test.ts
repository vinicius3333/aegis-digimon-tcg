import { describe, it, expect, vi } from "vitest";
import { CardKind, EffectTiming, digivolutionRequirementsFor, type CardDefinition, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
    securityToHand: vi.fn<(...args: any[]) => any>(async (seat: Seat, n: number, opts?: { fromTop?: boolean }) => {
      calls.push(`securityToHand:${seat}:${n}:${opts?.fromTop === true}`);
      return [];
    }),
    recoverToSecurity: vi.fn<(...args: any[]) => any>(async (seat: Seat, n: number) => {
      calls.push(`recoverToSecurity:${seat}:${n}`);
      return [];
    }),
    suspend: vi.fn<(...args: any[]) => any>(async (ids: string[]) => {
      calls.push(`suspend:${ids.join(",")}`);
      suspended.push(ids);
      return ids;
    }),
  } as unknown as Primitives;

  const offered: string[][] = [];
  const ask = {
    chooseTargets: vi.fn<(...args: any[]) => any>(async (_ctx: unknown, opts: { candidates: string[] }) => {
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
  it("uses the exact level-3 Larva/Insectoid/NSp alternate evolution for cost 2", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 3,
      traits: ["Larva", "Insectoid", "NSp"],
      cost: 2,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT26-035", as: "nspBase" }],
        hand: [{ card: CARD_ID, as: "hudiemon" }],
        deck: ["AD1-001", "AD1-002"],
        security: ["AD1-003"],
      },
    });
    legal.state.memory = 2;

    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("nspBase").permanentId,
        instanceId: legal.inst("hudiemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("nspBase").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT24-009", as: "wrongTrait" }],
        hand: [{ card: CARD_ID, as: "hudiemon" }],
      },
    });
    illegal.state.memory = 2;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("wrongTrait").permanentId,
        instanceId: illegal.inst("hudiemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("publicly moves the top security to hand, recovers from deck, then optionally suspends either player's Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "hudiemon" }],
          deck: [{ card: "BT1-009", as: "recovered" }],
          security: [{ card: "BT1-013", as: "oldTop" }, "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 4;
    const oldTopId = s.inst("oldTop").instanceId;
    const recoveredId = s.inst("recovered").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hudiemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === CARD_ID));
    await settle(() => s.perm("target").isSuspended);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === oldTopId)).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === recoveredId)).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
  }, 30_000);

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

  it("inherited effect gains memory only for this Digimon's battle wins, once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-082", as: "host", under: [CARD_ID] }] },
      1: {
        battleArea: [
          { card: "BT26-035", as: "first", suspended: true },
          { card: "BT26-038", as: "second", suspended: true },
        ],
      },
    });
    await s.ready();
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: firstId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstId));
    expect(s.state.memory).toBe(1);

    await settle(() => s.state.phase === "Main" && !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: secondId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondId));
    expect(s.state.memory).toBe(1);
  });

  it("does not gain inherited memory when its host wins a battle on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-082", as: "host", under: [CARD_ID], suspended: true }] },
      1: { battleArea: [{ card: "BT26-038", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === attackerId));

    expect(s.state.memory).toBe(0);
  });
});
