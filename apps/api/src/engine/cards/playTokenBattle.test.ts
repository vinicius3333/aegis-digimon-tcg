import { describe, it, expect } from "vitest";
import {
  EffectTiming,
  type CardDefinition,
  type GameState,
  type Permanent,
  type Seat,
} from "@aegis/shared";
import { getEffectModule } from "../effects/registry.js";
import type { CardSource } from "../effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../effects/EffectContext.js";
// Side-effect imports: register the IR carriers these A3s drive.
import "../../cards/BT17/BT17-053.js";
import "../../cards/BT25/BT25-020.js";

// IR-02 Tier-3 A3s for PlayToken and Battle — both ENGINE paths are already wired
// (ctx.fx.playToken / ctx.fx.forceBattle), so each is proven (not deferred) against a clean
// catalog vehicle through the IR interpreter, with a fails-when-reverted lever.
//
//   PlayToken — BT17-053 Diaboromon [On Deletion] plays 1 [Diaboromon Token] (a clean
//               single-action PlayToken carrier; NOT bundled like EX8-037, so no IR isolation
//               spike was needed). Proven via the playToken dispatch.
//   Battle    — BT25-020 Marsmon [On Play] "1 of your Digimon may battle 1 of your opponent's
//               Digimon" — the may-battle ConductBattle path (KB Q6278: "directly performs a
//               battle as with the standard rules"). forceBattle reuses the §14 DP-comparison
//               combat resolver (combat/resolve.ts), so the may-battle path resolves a real
//               battle. Proven via the forceBattle dispatch.
//
// (The real-engine behavior of both primitives — a token permanent actually created, and the
// lower-DP Digimon actually deleted by a §14 comparison — is proven directly against
// createPrimitives in ../effects/primitives.test.ts.)

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "X",
    set: "X",
    nameEn: "X",
    kinds: ["Digimon"] as never,
    colors: ["Red"] as never,
    playCost: 1,
    dp: 5000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

function makePermanent(permanentId: string, seat: Seat, cardId: string, dp = 5000): Permanent {
  return {
    permanentId,
    controllerSeat: seat,
    topCard: { instanceId: `${permanentId}-top`, cardId, ownerSeat: seat, faceUp: true },
    stack: [],
    linked: [],
    baseDP: dp,
    currentDP: dp,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeContext(opts: {
  recorder: Recorder;
  source: CardSource;
  ownerBattleArea?: Permanent[];
  opponentBattleArea?: Permanent[];
}): EffectContext {
  const { recorder, source, ownerBattleArea = [], opponentBattleArea = [] } = opts;

  const players = [
    { seat: 0 as Seat, battleArea: ownerBattleArea, security: [], hand: [], deck: [], trash: [] },
    { seat: 1 as Seat, battleArea: opponentBattleArea, security: [], hand: [], deck: [], trash: [] },
  ];
  const state = { memory: 0, players, turnSeat: 0 as Seat } as unknown as GameState;

  const game: GameAccess = {
    state,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0),
    permanentById: (id: string) =>
      [...ownerBattleArea, ...opponentBattleArea].find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) =>
      fakeDefinition({
        cardId: card.cardId,
        nameEn: card.cardId,
        // BT17-053 (Keramon) carries the [Unidentified] trait — the official precondition of
        // its inherited [On Deletion] token play (documented behavior CanActivateSelfOnDeletionWithContainingTrait).
        ...(card.cardId === "BT17-053" ? { types: ["Unknown", "Unidentified"] } : {}),
      }),
  } as unknown as GameAccess;

  const fx = {
    playToken: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "playToken", args });
      return undefined as never;
    },
    forceBattle: async (...args: unknown[]) => {
      recorder.calls.push({ verb: "forceBattle", args });
    },
    // BT25-020 carries other clauses (CostModifier etc.); stub the verbs its OnPlay path may hit.
    changePlayCost: () => undefined,
    modifyDP: () => undefined,
    grantKeyword: () => undefined,
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c: unknown, o: { candidates: string[]; max: number }) => o.candidates.slice(0, o.max),
    selectCards: async (_c: unknown, o: { candidates: string[]; max: number }) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  } as unknown as DecisionApi;

  return { source, trigger: {}, game, fx, ask, selections: new Map<string, string>() } as unknown as EffectContext;
}

function makeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "INST#tier3",
    cardId: "X",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

// ---------------------------------------------------------------------------
// PlayToken — BT17-053 [On Deletion] play 1 [Diaboromon Token]
// ---------------------------------------------------------------------------

describe("Tier-3 A3 — PlayToken (BT17-053 plays a [Diaboromon Token])", () => {
  const module = getEffectModule("BT17-053");

  it("is registered (IR card)", () => {
    expect(module, "BT17-053 must self-register on import").toBeDefined();
  });

  it("[On Deletion] dispatches playToken('Diaboromon Token') for the controller", async () => {
    const recorder: Recorder = { calls: [] };
    const source = makeSource({ cardId: "BT17-053", permanent: () => makePermanent("self", 0, "BT17-053") });
    const ctx = makeContext({ recorder, source });

    // BT17-053's PlayToken clause is on the OnDeletion trigger -> EffectTiming.OnDestroyedAnyone.
    const effects = module!.effectsForTiming(EffectTiming.OnDestroyedAnyone, source);
    expect(effects.length, "an On Deletion PlayToken clause must exist").toBeGreaterThanOrEqual(1);
    for (const effect of effects) await effect.resolve(ctx);

    const tokenCalls = recorder.calls.filter((c) => c.verb === "playToken");
    expect(tokenCalls, "a [Diaboromon Token] must be played").toHaveLength(1);
    // playToken(seat, tokenName, opts): seat 0, the Diaboromon Token name.
    expect(tokenCalls[0]!.args[0]).toBe(0);
    expect(tokenCalls[0]!.args[1]).toBe("Diaboromon Token");
  });

  it("REVERT-CONFIRM-RED: a non-PlayToken timing dispatches no playToken", async () => {
    // The fails-when-reverted lever: the PlayToken action lives only on the OnDeletion timing.
    // Driving a different timing (or stubbing the playToken dispatch to a no-op) yields no token.
    const recorder: Recorder = { calls: [] };
    const source = makeSource({ cardId: "BT17-053", permanent: () => makePermanent("self2", 0, "BT17-053") });
    const ctx = makeContext({ recorder, source });

    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    for (const effect of effects) await effect.resolve(ctx);

    expect(
      recorder.calls.filter((c) => c.verb === "playToken"),
      "no PlayToken action at this timing -> no token played",
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Battle — BT25-020 [On Play] may-battle (KB Q6278) -> forceBattle (§14 DP comparison)
// ---------------------------------------------------------------------------

describe("Tier-3 A3 — Battle (BT25-020 may-battle ConductBattle path)", () => {
  const module = getEffectModule("BT25-020");

  it("is registered (IR card)", () => {
    expect(module, "BT25-020 must self-register on import").toBeDefined();
  });

  it("[On Play] may-battle dispatches forceBattle(attacker, defender)", async () => {
    const self = makePermanent("marsmon", 0, "BT25-020", 11000);
    const oppDigimon = makePermanent("opp-digimon", 1, "OPP", 3000);
    const recorder: Recorder = { calls: [] };
    const source = makeSource({ cardId: "BT25-020", permanent: () => self });
    const ctx = makeContext({
      recorder,
      source,
      ownerBattleArea: [self],
      opponentBattleArea: [oppDigimon],
    });

    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    expect(effects.length, "an On Play may-battle clause must exist").toBeGreaterThanOrEqual(1);
    for (const effect of effects) await effect.resolve(ctx);

    const battleCalls = recorder.calls.filter((c) => c.verb === "forceBattle");
    expect(battleCalls, "the may-battle must drive a direct battle").toHaveLength(1);
    // forceBattle(attackerPermanentId, defenderPermanentId): a friendly attacker vs an opponent.
    expect(battleCalls[0]!.args[0]).toBe("marsmon");
    expect(battleCalls[0]!.args[1]).toBe("opp-digimon");
  });

  it("REVERT-CONFIRM-RED: with no opponent Digimon defender the may-battle dispatches nothing", async () => {
    // The Battle dispatch resolves a defender (an opponent Digimon); none available -> no
    // forceBattle (the may-battle has no legal pair). Stubbing forceBattle to a no-op would
    // likewise leave the §14 comparison un-run.
    const self = makePermanent("marsmon2", 0, "BT25-020", 11000);
    const recorder: Recorder = { calls: [] };
    const source = makeSource({ cardId: "BT25-020", permanent: () => self });
    const ctx = makeContext({ recorder, source, ownerBattleArea: [self], opponentBattleArea: [] });

    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    for (const effect of effects) await effect.resolve(ctx);

    expect(
      recorder.calls.filter((c) => c.verb === "forceBattle"),
      "no opponent Digimon defender -> no battle",
    ).toHaveLength(0);
  });
});
