import { describe, it, expect } from "vitest";
import { EffectDuration, EffectTiming, type CardInstance, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX10-023.js";

// A3 for EX10-023 (Astamon):
//   [On Play] / [When Digivolving] Suspend all other Digimon and Tamers on both sides.
//   [When Digivolving] / [When Attacking] (shared once/turn) Delete 1 suspended opponent Digimon.
//   [All Turns] Other than this Digimon, no Digimon or Tamers can unsuspend (restrict("unsuspend")).
//
// FAILS-WHEN-REVERTED: reverting the module removes the can't-unsuspend behavior while the
// declarative suspend actions remain present.

const SELF_INST = "self-inst";
const SELF_PERM = "astamon-perm";
const OWN_DIGIMON_PERM = "own-digimon-perm";
const OWN_TAMER_PERM = "own-tamer-perm";
const OPP_SUSPENDED_PERM = "opp-suspended-perm";
const OPP_UNSUSPENDED_PERM = "opp-unsuspended-perm";

function card(instanceId: string, cardId: string, seat: Seat = 0): CardInstance {
  return { instanceId, cardId, ownerSeat: seat, faceUp: true } as CardInstance;
}

function makeSource(isOnField = true): CardSource {
  return {
    instanceId: SELF_INST,
    cardId: "EX10-023",
    ownerSeat: 0 as Seat,
    definition: {
      cardId: "EX10-023",
      set: "EX10",
      nameEn: "Astamon",
      kinds: ["Digimon"] as never,
      colors: ["Green"] as never,
      playCost: 9,
      dp: 9000,
      level: 6,
      evoCosts: [],
      maxCountInDeck: 4,
    },
    permanent: () =>
      ({
        permanentId: SELF_PERM,
        controllerSeat: 0 as Seat,
        topCard: { instanceId: SELF_INST, cardId: "EX10-023", ownerSeat: 0 as Seat, faceUp: true } as never,
        stack: [] as CardInstance[],
        isSuspended: false,
        baseDP: 9000,
        currentDP: 9000,
      }) as never,
    isOnBattleArea: () => isOnField,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeCtx(
  source: CardSource,
  opts: {
    ownOtherDigimon?: boolean;
    ownTamer?: boolean;
    oppSuspendedDigimon?: boolean;
    oppUnsuspendedDigimon?: boolean;
  } = {},
): { ctx: EffectContext; recorder: { calls: { verb: string; args: unknown[] }[] } } {
  const { ownOtherDigimon = true, ownTamer = true, oppSuspendedDigimon = true, oppUnsuspendedDigimon = true } = opts;

  const recorder: { calls: { verb: string; args: unknown[] }[] } = { calls: [] };

  const ownerBattleArea: {
    permanentId: string;
    topCard: CardInstance;
    isSuspended: boolean;
    stack: CardInstance[];
    baseDP: number;
    currentDP: number;
  }[] = [
    {
      permanentId: SELF_PERM,
      topCard: card(SELF_INST, "EX10-023", 0),
      isSuspended: false,
      stack: [] as CardInstance[],
      baseDP: 9000,
      currentDP: 9000,
    },
  ];

  if (ownOtherDigimon) {
    ownerBattleArea.push({
      permanentId: OWN_DIGIMON_PERM,
      topCard: card("own-dig-top", "OWN-DIGIMON", 0),
      isSuspended: false,
      stack: [] as CardInstance[],
      baseDP: 5000,
      currentDP: 5000,
    });
  }
  if (ownTamer) {
    ownerBattleArea.push({
      permanentId: OWN_TAMER_PERM,
      topCard: card("own-tamer-top", "OWN-TAMER", 0),
      isSuspended: false,
      stack: [] as CardInstance[],
      baseDP: 0,
      currentDP: 0,
    });
  }

  const oppBattleArea: typeof ownerBattleArea = [];
  if (oppSuspendedDigimon) {
    oppBattleArea.push({
      permanentId: OPP_SUSPENDED_PERM,
      topCard: card("opp-susp-top", "OPP-DIGIMON", 1),
      isSuspended: true,
      stack: [] as CardInstance[],
      baseDP: 5000,
      currentDP: 5000,
    });
  }
  if (oppUnsuspendedDigimon) {
    oppBattleArea.push({
      permanentId: OPP_UNSUSPENDED_PERM,
      topCard: card("opp-unsusp-top", "OPP-DIGIMON2", 1),
      isSuspended: false,
      stack: [] as CardInstance[],
      baseDP: 6000,
      currentDP: 6000,
    });
  }

  const players = [
    {
      seat: 0 as Seat,
      hand: [],
      security: [],
      battleArea: ownerBattleArea,
      deck: [],
      trash: [],
    },
    {
      seat: 1 as Seat,
      hand: [],
      security: [],
      battleArea: oppBattleArea,
      deck: [],
      trash: [],
    },
  ];

  const game: GameAccess = {
    state: { memory: 0, players, turnSeat: 0 as Seat } as never,
    player: (seat: Seat) => players[seat] as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: () => undefined,
    definitionOf: (c: { cardId: string }) => {
      if (c.cardId === "OWN-TAMER") {
        return {
          cardId: c.cardId,
          kinds: ["Tamer"],
          nameEn: "Tamer",
          level: undefined,
          playCost: 3,
          colors: ["Green"],
        } as never;
      }
      return {
        cardId: c.cardId,
        kinds: ["Digimon"],
        nameEn: "Digimon",
        level: 5,
        playCost: 6,
        colors: ["Green"],
      } as never;
    },
  };

  const fx: Partial<Primitives> = {
    suspend: async (...args) => {
      recorder.calls.push({ verb: "suspend", args });
      return args[0];
    },
    deletePermanent: async (...args) => {
      recorder.calls.push({ verb: "deletePermanent", args });
      return 1;
    },
    restrict: (...args) => {
      recorder.calls.push({ verb: "restrict", args });
    },
  };

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  const ctx: EffectContext = {
    source,
    trigger: {},
    game,
    fx: fx as Primitives,
    ask,
  };

  return { ctx, recorder };
}

describe("EX10-023 Astamon", () => {
  const module = getEffectModule("EX10-023");

  it("blocks the real turn-start unsuspend phase for every other Digimon and Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX10-023", as: "quartzmon", suspended: true },
          { card: "BT1-009", as: "ownOther", suspended: true },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent", suspended: true }] },
    });
    await s.engine.recomputeContinuousEffects();

    await (s.engine as unknown as { unsuspendForActivePhase(seat: 0 | 1): Promise<string[]> }).unsuspendForActivePhase(
      0,
    );

    expect(s.perm("quartzmon").isSuspended).toBe(false);
    expect(s.perm("ownOther").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("is registered on import", () => {
    expect(module, "EX10-023 must self-register").toBeDefined();
  });

  it("produces an OnPlay effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
  });

  it("produces 2 WhenDigivolving effects (suspend-all + delete-suspended)", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(2);
  });

  it("produces an OnAllyAttack (WhenAttacking) effect", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.OnAllyAttack, source)).toHaveLength(1);
  });

  it("produces a None (static) effect for can't-unsuspend", () => {
    const source = makeSource();
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(1);
  });

  it("[On Play] suspends all other Digimon and Tamers (not self)", async () => {
    // FAILS-WHEN-REVERTED: IR suspend body uses filter model; no problem for IR, but we
    // specifically verify the hand-written module suspends own-digimon AND own-tamer.
    const source = makeSource();
    const { ctx, recorder } = makeCtx(source, {
      ownOtherDigimon: true,
      ownTamer: true,
      oppSuspendedDigimon: true,
    });
    const effects = module!.effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(ctx);

    const suspCalls = recorder.calls.filter((c) => c.verb === "suspend");
    expect(suspCalls).toHaveLength(1);
    const suspended = suspCalls[0]!.args[0] as string[];
    // Self (SELF_PERM) must NOT be in the list
    expect(suspended).not.toContain(SELF_PERM);
    // Own other Digimon and Tamer must be suspended
    expect(suspended).toContain(OWN_DIGIMON_PERM);
    expect(suspended).toContain(OWN_TAMER_PERM);
  });

  it("[When Digivolving] first effect suspends all others", async () => {
    const source = makeSource();
    const { ctx, recorder } = makeCtx(source, { ownOtherDigimon: true });
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);

    const suspCalls = recorder.calls.filter((c) => c.verb === "suspend");
    expect(suspCalls).toHaveLength(1);
    const suspended = suspCalls[0]!.args[0] as string[];
    expect(suspended).not.toContain(SELF_PERM);
    expect(suspended).toContain(OWN_DIGIMON_PERM);
  });

  it("[When Digivolving] second effect deletes 1 suspended opponent Digimon", async () => {
    // FAILS-WHEN-REVERTED: IR delete action uses a filter, but shared effectKey for
    // once-per-turn is the hallmark of the hand-written module
    const source = makeSource();
    const { ctx, recorder } = makeCtx(source, {
      oppSuspendedDigimon: true,
      oppUnsuspendedDigimon: false,
    });
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[1]!.resolve(ctx);

    const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deleteCalls).toHaveLength(1);
    const targets = deleteCalls[0]!.args[0] as string[];
    expect(targets).toContain(OPP_SUSPENDED_PERM);
    // Unsuspended opponent must NOT be targeted
    expect(targets).not.toContain(OPP_UNSUSPENDED_PERM);
  });

  it("[When Attacking] deletes 1 suspended opponent Digimon", async () => {
    // FAILS-WHEN-REVERTED: IR WA path is a separate effect; shared effectKey ensures
    // once-per-turn across WD and WA in the hand-written module
    const source = makeSource();
    const { ctx, recorder } = makeCtx(source, {
      oppSuspendedDigimon: true,
      oppUnsuspendedDigimon: false,
    });
    const effects = module!.effectsForTiming(EffectTiming.OnAllyAttack, source);
    await effects[0]!.resolve(ctx);

    const deleteCalls = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(deleteCalls).toHaveLength(1);
    expect((deleteCalls[0]!.args[0] as string[]).includes(OPP_SUSPENDED_PERM)).toBe(true);
  });

  it("[All Turns] restricts 'unsuspend' on all battle-area Digimon/Tamers except self", async () => {
    // FAILS-WHEN-REVERTED: the reverted IR has no restrict('unsuspend') calls
    const source = makeSource();
    const { ctx, recorder } = makeCtx(source, {
      ownOtherDigimon: true,
      ownTamer: true,
      oppSuspendedDigimon: true,
    });
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    await effects[0]!.resolve(ctx);

    const restrictCalls = recorder.calls.filter((c) => c.verb === "restrict");
    expect(restrictCalls.length).toBeGreaterThanOrEqual(1);
    // Every restrict call must be for "unsuspend"
    for (const call of restrictCalls) {
      expect(call.args[1]).toBe("unsuspend");
      expect(call.args[2]).toBe(EffectDuration.UntilEachTurnEnd);
    }
    // Self must NOT be restricted
    const restrictedIds = restrictCalls.map((c) => c.args[0] as string);
    expect(restrictedIds).not.toContain(SELF_PERM);
    // Own Digimon and own Tamer must be restricted
    expect(restrictedIds).toContain(OWN_DIGIMON_PERM);
    expect(restrictedIds).toContain(OWN_TAMER_PERM);
  });

  it("[When Digivolving] delete effect does NOT fire when no suspended opponent Digimon", async () => {
    const source = makeSource();
    const { ctx, recorder: _recorder } = makeCtx(source, {
      oppSuspendedDigimon: false,
      oppUnsuspendedDigimon: true,
    });
    const effects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    // canActivate should return false
    expect(effects[1]!.canActivate(ctx)).toBe(false);
  });

  it("WhenDigivolving delete and WhenAttacking delete share effectKey (once-per-turn)", () => {
    // FAILS-WHEN-REVERTED: IR uses sharedUseKey which is an IR concept; the hand-written
    // module must use the SAME effectKey string for both effects
    const source = makeSource();
    const wdEffects = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    const waEffects = module!.effectsForTiming(EffectTiming.OnAllyAttack, source);

    const wdDeleteEffect = wdEffects[1]!;
    const waDeleteEffect = waEffects[0]!;
    expect(wdDeleteEffect.effectKey).toBe(waDeleteEffect.effectKey);
  });
});
