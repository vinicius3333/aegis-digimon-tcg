import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type Permanent, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives, ReplacementInstall } from "../../engine/effects/EffectContext.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./BT20-027.js";

// A3 for BT20-027 (Slayerdramon — Blue Lv.6 Digimon). Covers all hand-written clauses:
//   ＜Piercing＞ / [On Play] / [When Digivolving] trash-3-then-delete /
//   [All Turns] unsuspend on opponent security removal /
//   (Inherited) suspend-to-prevent-leave (the RawUnparsed residual).
//
// FAILS-WHEN-REVERTED: the declarative effect never installs the inherited leave-prevention
// (it carried a RawUnparsed residual), so no wouldLeavePlay replacement is subscribed.

interface Recorder {
  calls: { verb: string; args: unknown[] }[];
  replacements: ReplacementInstall[];
}

function fakeDefinition(over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: "BT20-027",
    set: "BT20",
    nameEn: "Slayerdramon",
    kinds: ["Digimon"] as never,
    colors: ["Blue"] as never,
    playCost: 12,
    dp: 12000,
    level: 6,
    evoCosts: [],
    maxCountInDeck: 4,
    ...over,
  };
}

type PermSpec = {
  permanentId: string;
  controllerSeat: Seat;
  cardId?: string;
  stackCardIds?: string[];
  isSuspended?: boolean;
};

function makePermanent(spec: PermSpec): Permanent {
  return {
    permanentId: spec.permanentId,
    controllerSeat: spec.controllerSeat,
    topCard: {
      instanceId: `${spec.permanentId}-top`,
      cardId: spec.cardId ?? `def-${spec.permanentId}`,
      ownerSeat: spec.controllerSeat,
      faceUp: true,
    } as never,
    stack: (spec.stackCardIds ?? []).map((cid, i) => ({
      instanceId: `${spec.permanentId}-divo-${i}`,
      cardId: cid,
      ownerSeat: spec.controllerSeat,
      faceUp: false,
    })) as never,
    linked: [] as never,
    baseDP: 1000,
    currentDP: 1000,
    isSuspended: spec.isSuspended ?? false,
    inBreeding: false,
  } as unknown as Permanent;
}

const SELF_PERM = "SELF-PERM";

function makeSource(opts: { onField?: boolean } = {}): CardSource {
  const perm = makePermanent({ permanentId: SELF_PERM, controllerSeat: 0 as Seat, cardId: "BT20-027" });
  return {
    instanceId: `${SELF_PERM}-top`,
    cardId: "BT20-027",
    ownerSeat: 0 as Seat,
    definition: fakeDefinition(),
    permanent: () => perm,
    isOnBattleArea: () => opts.onField ?? true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  } as unknown as CardSource;
}

function makeContext(opts: {
  recorder: Recorder;
  source: CardSource;
  perms?: Permanent[];
  defs?: Map<string, Partial<CardDefinition>>;
  trigger?: EffectContext["trigger"];
}): EffectContext {
  const rec = opts.recorder;
  const perms = opts.perms ?? [];
  const allPerms = [...perms];
  const selfPerm = opts.source.permanent();
  if (selfPerm && !allPerms.some((p) => p.permanentId === selfPerm.permanentId)) allPerms.push(selfPerm);
  const defs = opts.defs ?? new Map();

  const game: GameAccess = {
    state: { memory: 0, players: [], turnSeat: 0 as Seat } as never,
    player: (seat: Seat) =>
      ({
        seat,
        battleArea: allPerms.filter((p) => p.controllerSeat === seat),
        security: [],
        hand: [],
        deck: [],
        trash: [],
      }) as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => allPerms.find((p) => p.permanentId === id),
    definitionOf: (card: { cardId: string }) => fakeDefinition({ ...defs.get(card.cardId), cardId: card.cardId }),
  };

  const fx = {
    grantPierce: (...args: unknown[]) => rec.calls.push({ verb: "grantPierce", args }),
    trashDigivolutionCards: async (...args: unknown[]) => {
      rec.calls.push({ verb: "trashDigivolutionCards", args });
      return [];
    },
    deletePermanent: async (...args: unknown[]) => {
      rec.calls.push({ verb: "deletePermanent", args });
      return (args[0] as string[]).length;
    },
    unsuspend: (...args: unknown[]) => rec.calls.push({ verb: "unsuspend", args }),
    payActivationCost: (...args: unknown[]) => {
      rec.calls.push({ verb: "payActivationCost", args });
      return true;
    },
    subscribeReplacement: (sub: ReplacementInstall) => {
      rec.replacements.push(sub);
      return rec.replacements.length;
    },
  } as unknown as Primitives;

  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
    selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
    selectCards: async (_c, o) => o.candidates.slice(0, o.max),
    chooseOption: async () => 0,
  };

  return { source: opts.source, trigger: opts.trigger ?? {}, game, fx, ask };
}

describe("BT20-027 Slayerdramon", () => {
  const module = getEffectModule("BT20-027");

  it("is registered on import", () => {
    expect(module).toBeDefined();
  });

  it("＜Piercing＞ grants pierce to the source on the security-check window", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [], replacements: [] };
    const ctx = makeContext({ recorder, source });
    const effects = module!.effectsForTiming(EffectTiming.OnDetermineDoSecurityCheck, source);
    expect(effects).toHaveLength(1);
    await effects[0]!.resolve(ctx);
    expect(recorder.calls.filter((c) => c.verb === "grantPierce")).toHaveLength(1);
  });

  it("[On Play] trashes 3 divo cards of 1 opponent Digimon, then deletes 1 with no stack", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [], replacements: [] };
    const oppWithStack = makePermanent({
      permanentId: "OPP-STACK",
      controllerSeat: 1 as Seat,
      stackCardIds: ["a", "b", "c", "d"],
    });
    const oppNoStack = makePermanent({ permanentId: "OPP-BARE", controllerSeat: 1 as Seat });
    const ctx = makeContext({ recorder, source, perms: [oppWithStack, oppNoStack] });

    const [effect] = module!.effectsForTiming(EffectTiming.OnPlay, source);
    expect(effect!.canActivate(ctx)).toBe(true);
    await effect!.resolve(ctx);

    const trash = recorder.calls.filter((c) => c.verb === "trashDigivolutionCards");
    expect(trash).toHaveLength(1);
    expect(trash[0]!.args[0]).toBe("OPP-STACK");
    expect((trash[0]!.args[1] as string[]).length).toBe(3); // capped at 3 of 4

    const del = recorder.calls.filter((c) => c.verb === "deletePermanent");
    expect(del).toHaveLength(1);
    expect((del[0]!.args[0] as string[])).toContain("OPP-BARE");
  });

  it("[When Digivolving] uses the same body", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [], replacements: [] };
    const oppNoStack = makePermanent({ permanentId: "OPP-BARE", controllerSeat: 1 as Seat });
    const ctx = makeContext({ recorder, source, perms: [oppNoStack] });
    const [effect] = module!.effectsForTiming(EffectTiming.WhenDigivolving, source);
    expect(effect!.canActivate(ctx)).toBe(true);
    await effect!.resolve(ctx);
    expect(recorder.calls.filter((c) => c.verb === "deletePermanent")).toHaveLength(1);
  });

  it("[All Turns] unsuspends an own [Dracomon]-text Digimon when the opponent's security is removed", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [], replacements: [] };
    // My attacker removed opponent's security.
    const myAttacker = makePermanent({ permanentId: "MY-ATK", controllerSeat: 0 as Seat });
    const myDracomon = makePermanent({
      permanentId: "MY-DRACO",
      controllerSeat: 0 as Seat,
      cardId: "DRACO",
      isSuspended: true,
    });
    const defs = new Map<string, Partial<CardDefinition>>([["DRACO", { nameEn: "Dracomon" }]]);
    const ctx = makeContext({
      recorder,
      source,
      perms: [myAttacker, myDracomon],
      defs,
      trigger: { attackerPermanentId: "MY-ATK", securityInstanceId: "sec-1" },
    });

    const [effect] = module!.effectsForTiming(EffectTiming.OnLoseSecurity, source);
    expect(effect!.maxPerTurn).toBe(1);
    expect(effect!.canTrigger(ctx)).toBe(true);
    expect(effect!.canActivate(ctx)).toBe(true);
    await effect!.resolve(ctx);

    const uns = recorder.calls.filter((c) => c.verb === "unsuspend");
    expect(uns).toHaveLength(1);
    expect((uns[0]!.args[0] as string[])).toContain("MY-DRACO");
  });

  it("[All Turns] does NOT trigger when the opponent's attacker removed MY security", () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [], replacements: [] };
    const oppAttacker = makePermanent({ permanentId: "OPP-ATK", controllerSeat: 1 as Seat });
    const ctx = makeContext({
      recorder,
      source,
      perms: [oppAttacker],
      trigger: { attackerPermanentId: "OPP-ATK" },
    });
    const [effect] = module!.effectsForTiming(EffectTiming.OnLoseSecurity, source);
    expect(effect!.canTrigger(ctx)).toBe(false);
  });

  it("(Inherited) installs a wouldLeavePlay prevention that protects own [Examon]-text Digimon and pays by suspend", async () => {
    const source = makeSource();
    const recorder: Recorder = { calls: [], replacements: [] };
    const ctx = makeContext({ recorder, source });
    const [effect] = module!.effectsForTiming(EffectTiming.None, source);
    expect(effect!.isInherited).toBe(true);
    await effect!.resolve(ctx);

    expect(recorder.replacements).toHaveLength(1);
    const sub = recorder.replacements[0]!;
    expect(sub.event).toBe("wouldLeavePlay");
    expect(sub.mode).toBe("prevent");
    if (sub.mode !== "prevent") throw new Error("expected mode 'prevent'"); // narrows the rest of this test
    expect(sub.affectsAll).toBe(true);
    // "other than in battle": byBattle blocked, byEffect/byRule allowed.
    expect(sub.causeAllows!("byBattle", 0 as Seat, false)).toBe(false);
    expect(sub.causeAllows!("byEffect", 0 as Seat, false)).toBe(true);

    // protects an own [Examon]-text Digimon, not the opponent's nor a non-matching one.
    const ownExamon = makePermanent({ permanentId: "OWN-EX", controllerSeat: 0 as Seat, cardId: "EX" });
    const oppExamon = makePermanent({ permanentId: "OPP-EX", controllerSeat: 1 as Seat, cardId: "EX" });
    const ownPlain = makePermanent({ permanentId: "OWN-PLAIN", controllerSeat: 0 as Seat, cardId: "PLAIN" });
    const defs = new Map<string, Partial<CardDefinition>>([
      ["EX", { nameEn: "Examon" }],
      ["PLAIN", { nameEn: "Agumon" }],
    ]);
    const protectCtx = makeContext({ recorder, source, perms: [ownExamon, oppExamon, ownPlain], defs });
    expect(sub.protects!(protectCtx, "OWN-EX")).toBe(true);
    expect(sub.protects!(protectCtx, "OPP-EX")).toBe(false);
    expect(sub.protects!(protectCtx, "OWN-PLAIN")).toBe(false);

    // preventCheck pays by suspending the host.
    const ok = await sub.preventCheck(protectCtx, "OWN-EX");
    expect(ok).toBe(true);
    const pay = recorder.calls.filter((c) => c.verb === "payActivationCost");
    expect(pay).toHaveLength(1);
    expect(pay[0]!.args[0]).toBe(SELF_PERM);
    expect(pay[0]!.args[1]).toBe("suspend");
  });
});
