import { describe, it, expect } from "vitest";
import { EffectDuration, EffectTiming, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, Primitives, SubTriggerInstall } from "../../engine/effects/EffectContext.js";
import "./BT15-084.js";

// A3 for BT15-084 (Kari Kamiya) — Yellow Tamer.
//
// Clauses:
//   [OnDiscardSecurity] When an effect trashes this card from the security stack,
//     1 of your opponent's Digimon gains SecurityAttack-1 until end of their turn.
//   [OnStartTurn] If you have 2 memory or less, set your memory to 3.
//   [None / Static] Install whenEffectRemovesFromSecurity watcher:
//     cost: suspend this Tamer; effect: SecurityAttack-1 on 1 opponent Digimon.
//   [SecuritySkill] Play this Tamer without paying its memory cost.
//
// FAILS-WHEN-REVERTED: the declarative effect has:
//   - No OnDiscardSecurity effect (the grant-SecurityAttack-on-security-trash clause is absent).
//   - The AllTurns SubTrigger body is RawUnparsed (no executable suspend + grantKeyword).
//   - No [Security] playFromSecurity call in the SecuritySkill clause.

const cardId = "BT15-084";

interface Call {
  verb: string;
  args: unknown[];
}

let permanentSeq = 0;

function fakePermanentId(): string {
  return `PERM#${++permanentSeq}`;
}

function makeSource(opts: {
  permanentId?: string;
  isSuspended?: boolean;
  onField?: boolean;
  ownerSeat?: Seat;
} = {}): CardSource {
  const permId = opts.permanentId ?? fakePermanentId();
  const suspended = opts.isSuspended ?? false;
  const onField = opts.onField ?? true;
  const ownerSeat = opts.ownerSeat ?? (0 as Seat);

  return {
    instanceId: `INST#${cardId}`,
    cardId,
    ownerSeat,
    definition: {
      cardId,
      set: "BT15",
      nameEn: "Kari Kamiya",
      kinds: ["Tamer"],
      colors: ["Yellow"],
      playCost: 2,
      dp: undefined,
      evoCosts: [],
      maxCountInDeck: 4,
    } as never,
    permanent: () =>
      ({
        permanentId: permId,
        controllerSeat: ownerSeat,
        topCard: { instanceId: `INST#${cardId}`, cardId, ownerSeat, faceUp: true } as never,
        isSuspended: suspended,
        stack: [],
        linked: [],
        inBreeding: false,
      }) as never,
    isOnBattleArea: () => onField,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

function makeRecorder(): { calls: Call[] } {
  return { calls: [] };
}

function makeCtx(opts: {
  recorder: { calls: Call[] };
  source: CardSource;
  memory?: number;
  opponentBattleArea?: Array<{ permanentId: string; isSuspended?: boolean }>;
}): EffectContext {
  const rec = opts.recorder;
  const memory = opts.memory ?? 0;
  const opponentBattleArea = (opts.opponentBattleArea ?? []).map((p) => ({
    permanentId: p.permanentId,
    isSuspended: p.isSuspended ?? false,
    inBreeding: false,
    topCard: { instanceId: `${p.permanentId}-top`, cardId: "DUMMY", ownerSeat: 1 as Seat } as never,
    stack: [],
    linked: [],
  }));

  const fx = new Proxy({} as Primitives, {
    get: (_, verb: string) =>
      (...args: unknown[]) => {
        rec.calls.push({ verb, args });
        if (verb === "suspend") return Promise.resolve();
        if (verb === "playFromSecurity") return Promise.resolve(undefined);
        return undefined;
      },
  });

  return {
    source: opts.source,
    trigger: {},
    game: {
      state: { memory } as never,
      player: (seat: Seat) => {
        if (seat !== opts.source.ownerSeat) {
          return { battleArea: opponentBattleArea } as never;
        }
        return { battleArea: [] } as never;
      },
      opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
      permanentById: () => undefined,
      definitionOf: () => ({ kinds: ["Digimon"] }) as never,
    } as never,
    fx,
    ask: {
      optional: async () => true,
      chooseTargets: async (_c: unknown, o: { candidates: string[]; max: number }) => o.candidates.slice(0, o.max),
      selectCards: async (_c: unknown, o: { candidates: string[]; max: number }) => o.candidates.slice(0, o.max),
      chooseOption: async () => 0,
    } as never,
  };
}

// ── Module registration ──────────────────────────────────────────────────────

describe("BT15-084 module registration", () => {
  it("registers on import", () => {
    const mod = getEffectModule(cardId);
    expect(mod, `${cardId} must self-register on import`).toBeDefined();
    expect(mod!.cardId).toBe(cardId);
  });
});

// ── Effect structure ─────────────────────────────────────────────────────────

describe("BT15-084 effect structure", () => {
  const mod = getEffectModule(cardId)!;

  it("returns 1 effect at OnDiscardSecurity", () => {
    const source = makeSource();
    const effects = mod.effectsForTiming(EffectTiming.OnDiscardSecurity, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/when-trashed-from-security`);
  });

  it("returns 1 effect at OnStartTurn", () => {
    const source = makeSource();
    const effects = mod.effectsForTiming(EffectTiming.OnStartTurn, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/start-of-your-turn-set-memory`);
  });

  it("returns 1 effect at EffectTiming.None (static sub-trigger install)", () => {
    const source = makeSource();
    const effects = mod.effectsForTiming(EffectTiming.None, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/all-turns-suspend-security-attack`);
  });

  it("returns 1 effect at SecuritySkill", () => {
    const source = makeSource();
    const effects = mod.effectsForTiming(EffectTiming.SecuritySkill, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.isSecurity).toBe(true);
    expect(effects[0]!.effectKey).toBe(`${cardId}/security-play-self`);
  });

  it("returns no effects at OnPlay, WhenDigivolving, OnEndTurn", () => {
    const source = makeSource();
    expect(mod.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(0);
    expect(mod.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(0);
    expect(mod.effectsForTiming(EffectTiming.OnEndTurn, source)).toHaveLength(0);
  });

  it("OnDiscardSecurity effect is not isSecurity, not isInherited", () => {
    const source = makeSource();
    const effect = mod.effectsForTiming(EffectTiming.OnDiscardSecurity, source)[0]!;
    expect(effect.isSecurity).toBe(false);
    expect(effect.isInherited).toBe(false);
  });
});

// ── OnDiscardSecurity: grant SecurityAttack -1 to opponent Digimon ───────────

describe("BT15-084 OnDiscardSecurity behavior", () => {
  const mod = getEffectModule(cardId)!;

  it("grants SecurityAttack -1 with UntilOpponentTurnEnd to a chosen opponent Digimon", async () => {
    const oppPermId = fakePermanentId();
    const source = makeSource();
    const recorder = makeRecorder();
    const ctx = makeCtx({
      recorder,
      source,
      opponentBattleArea: [{ permanentId: oppPermId }],
    });

    const effects = mod.effectsForTiming(EffectTiming.OnDiscardSecurity, source);
    await effects[0]!.resolve(ctx);

    const call = recorder.calls.find(
      (c) => c.verb === "grantKeyword" && c.args[1] === "SecurityAttack",
    );
    // FAILS-WHEN-REVERTED: the declarative effect emits no OnDiscardSecurity effect at all.
    expect(call, "grantKeyword(SecurityAttack) must be called").toBeDefined();
    expect(call!.args[0]).toBe(oppPermId);
    expect(call!.args[2]).toBe(EffectDuration.UntilOpponentTurnEnd);
    expect(call!.args[3]).toBe(-1);
  });

  it("does nothing when opponent has no Digimon on the battle area", async () => {
    const source = makeSource();
    const recorder = makeRecorder();
    const ctx = makeCtx({ recorder, source, opponentBattleArea: [] });

    const effects = mod.effectsForTiming(EffectTiming.OnDiscardSecurity, source);
    await effects[0]!.resolve(ctx);

    expect(recorder.calls.filter((c) => c.verb === "grantKeyword")).toHaveLength(0);
  });

  it("canTrigger always returns true (no on-field guard)", () => {
    const offFieldSource = makeSource({ onField: false });
    const effects = mod.effectsForTiming(EffectTiming.OnDiscardSecurity, offFieldSource);
    const result = effects[0]!.canTrigger({ source: offFieldSource } as never);
    expect(result).toBe(true);
  });
});

// ── OnStartTurn: set memory to 3 when <= 2 ──────────────────────────────────

describe("BT15-084 OnStartTurn behavior", () => {
  const mod = getEffectModule(cardId)!;

  it("sets memory to 3 when memory is 2", async () => {
    const source = makeSource();
    const recorder = makeRecorder();
    const ctx = makeCtx({ recorder, source, memory: 2 });

    const effects = mod.effectsForTiming(EffectTiming.OnStartTurn, source);
    await effects[0]!.resolve(ctx);

    const call = recorder.calls.find((c) => c.verb === "setMemory");
    // FAILS-WHEN-REVERTED: the declarative effect record's SetMemory runs via the interpreter, not here.
    expect(call, "setMemory must be called").toBeDefined();
    expect(call!.args[0]).toBe(3);
  });

  it("sets memory to 3 when memory is 0", async () => {
    const source = makeSource();
    const recorder = makeRecorder();
    const ctx = makeCtx({ recorder, source, memory: 0 });

    const effects = mod.effectsForTiming(EffectTiming.OnStartTurn, source);
    await effects[0]!.resolve(ctx);

    const call = recorder.calls.find((c) => c.verb === "setMemory");
    expect(call).toBeDefined();
    expect(call!.args[0]).toBe(3);
  });

  it("does not set memory when memory is already 3 or more", async () => {
    const source = makeSource();
    const recorder = makeRecorder();
    const ctx = makeCtx({ recorder, source, memory: 3 });

    const effects = mod.effectsForTiming(EffectTiming.OnStartTurn, source);
    // canTrigger checks memory <= 2 via `when`; resolve double-checks
    await effects[0]!.resolve(ctx);

    expect(recorder.calls.filter((c) => c.verb === "setMemory")).toHaveLength(0);
  });

  it("canTrigger is false when off-field", () => {
    const offFieldSource = makeSource({ onField: false });
    const effects = mod.effectsForTiming(EffectTiming.OnStartTurn, offFieldSource);
    const result = effects[0]!.canTrigger({ source: offFieldSource, game: { state: { memory: 0 } } } as never);
    expect(result).toBe(false);
  });
});

// ── None (static): whenEffectRemovesFromSecurity sub-trigger install ─────────

describe("BT15-084 static sub-trigger install", () => {
  const mod = getEffectModule(cardId)!;

  it("installs a whenEffectRemovesFromSecurity subscription on resolve", async () => {
    const source = makeSource();
    const _recorder = makeRecorder();

    const installedSubs: SubTriggerInstall[] = [];
    const ctx: EffectContext = {
      source,
      trigger: {},
      game: {} as never,
      fx: {
        subscribeSubTrigger: (sub: SubTriggerInstall) => {
          installedSubs.push(sub);
          return 0;
        },
      } as never,
      ask: {} as never,
    };

    const effects = mod.effectsForTiming(EffectTiming.None, source);
    await effects[0]!.resolve(ctx);

    // FAILS-WHEN-REVERTED: the declarative effect record uses whenTrashedFromSecurity (wrong event)
    // with empty actions, so no whenEffectRemovesFromSecurity subscription is installed.
    expect(installedSubs).toHaveLength(1);
    expect(installedSubs[0]!.event).toBe("whenEffectRemovesFromSecurity");
  });

  it("subscription is anchored to the Tamer's permanentId", async () => {
    const permId = fakePermanentId();
    const source = makeSource({ permanentId: permId });
    const _recorder = makeRecorder();

    let capturedSub: SubTriggerInstall | undefined;
    const ctx: EffectContext = {
      source,
      trigger: {},
      game: {} as never,
      fx: {
        subscribeSubTrigger: (sub: SubTriggerInstall) => {
          capturedSub = sub;
          return 0;
        },
      } as never,
      ask: {} as never,
    };

    const effects = mod.effectsForTiming(EffectTiming.None, source);
    await effects[0]!.resolve(ctx);

    expect(capturedSub!.sourcePermanentId).toBe(permId);
    expect(capturedSub!.once).toBe(false);
  });

  it("subscription matches only when removedFromSecuritySeat === ownerSeat", async () => {
    const source = makeSource({ ownerSeat: 0 as Seat });

    let capturedSub: SubTriggerInstall | undefined;
    const ctx: EffectContext = {
      source,
      trigger: {},
      game: {} as never,
      fx: {
        subscribeSubTrigger: (sub: SubTriggerInstall) => {
          capturedSub = sub;
          return 0;
        },
      } as never,
      ask: {} as never,
    };

    const effects = mod.effectsForTiming(EffectTiming.None, source);
    await effects[0]!.resolve(ctx);

    expect(capturedSub!.matches).toBeDefined();

    // Matches when the removal was from ownerSeat (0).
    const ownSecurityCtx = { trigger: { removedFromSecuritySeat: 0 as Seat } } as never;
    expect(capturedSub!.matches!(ownSecurityCtx)).toBe(true);

    // Does not match when the removal was from the opponent's security (seat 1).
    const oppSecurityCtx = { trigger: { removedFromSecuritySeat: 1 as Seat } } as never;
    expect(capturedSub!.matches!(oppSecurityCtx)).toBe(false);
  });
});

// ── Sub-trigger run: suspend + grant SecurityAttack -1 ───────────────────────

describe("BT15-084 sub-trigger run behavior", () => {
  const mod = getEffectModule(cardId)!;

  async function installAndGetRun(
    source: CardSource,
  ): Promise<(subCtx: EffectContext) => Promise<void>> {
    let capturedRun: ((subCtx: EffectContext) => Promise<void>) | undefined;

    const installCtx: EffectContext = {
      source,
      trigger: {},
      game: {} as never,
      fx: {
        subscribeSubTrigger: (sub: SubTriggerInstall) => {
          capturedRun = sub.run;
          return 0;
        },
      } as never,
      ask: {} as never,
    };

    const effects = mod.effectsForTiming(EffectTiming.None, source);
    await effects[0]!.resolve(installCtx);
    return capturedRun!;
  }

  it("suspends the Tamer then grants SecurityAttack -1 to a chosen opponent Digimon", async () => {
    const permId = fakePermanentId();
    const source = makeSource({ permanentId: permId, isSuspended: false });
    const run = await installAndGetRun(source);

    const oppPermId = fakePermanentId();
    const recorder = makeRecorder();

    const subCtx: EffectContext = {
      source,
      trigger: { removedFromSecuritySeat: 0 as Seat },
      game: {
        player: (seat: Seat) => {
          if (seat === 0) return { battleArea: [] } as never;
          return {
            battleArea: [{
              permanentId: oppPermId,
              inBreeding: false,
              topCard: { instanceId: "opp-top", cardId: "DUMMY", ownerSeat: 1 as Seat } as never,
              isSuspended: false,
            }],
          } as never;
        },
        opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
        permanentById: () => undefined,
        definitionOf: () => ({ kinds: ["Digimon"] }) as never,
      } as never,
      fx: new Proxy({} as Primitives, {
        get: (_, verb: string) =>
          (...args: unknown[]) => {
            recorder.calls.push({ verb, args });
            if (verb === "suspend") return Promise.resolve();
            return undefined;
          },
      }),
      ask: {
        optional: async () => true,
        chooseTargets: async (_c: EffectContext, o: { candidates: string[]; min: number; max: number }) =>
          o.candidates.slice(0, o.max),
        selectCards: async () => [],
        chooseOption: async () => 0,
      } as never,
    };

    await run(subCtx);

    const suspendCall = recorder.calls.find((c) => c.verb === "suspend");
    // FAILS-WHEN-REVERTED: the declarative effect record has RawUnparsed for this clause; no suspend call.
    expect(suspendCall, "suspend must be called").toBeDefined();
    expect((suspendCall!.args[0] as string[])[0]).toBe(permId);

    const grantCall = recorder.calls.find(
      (c) => c.verb === "grantKeyword" && c.args[1] === "SecurityAttack",
    );
    expect(grantCall, "grantKeyword(SecurityAttack) must be called").toBeDefined();
    expect(grantCall!.args[0]).toBe(oppPermId);
    expect(grantCall!.args[2]).toBe(EffectDuration.UntilOpponentTurnEnd);
    expect(grantCall!.args[3]).toBe(-1);
  });

  it("skips the effect when the Tamer is already suspended", async () => {
    const source = makeSource({ isSuspended: true });
    const run = await installAndGetRun(source);

    const recorder = makeRecorder();

    const subCtx: EffectContext = {
      source,
      trigger: { removedFromSecuritySeat: 0 as Seat },
      game: {
        player: () => ({ battleArea: [] }) as never,
        opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
        permanentById: () => undefined,
        definitionOf: () => ({}) as never,
      } as never,
      fx: new Proxy({} as Primitives, {
        get: (_, verb: string) =>
          (...args: unknown[]) => {
            recorder.calls.push({ verb, args });
            return undefined;
          },
      }),
      ask: {} as never,
    };

    await run(subCtx);

    // Already-suspended tamer: the cost cannot be paid, effect does not fire.
    expect(recorder.calls.filter((c) => c.verb === "suspend")).toHaveLength(0);
    expect(recorder.calls.filter((c) => c.verb === "grantKeyword")).toHaveLength(0);
  });

  it("skips the effect when Tamer is no longer on the battle area", async () => {
    const offFieldSource = makeSource({ onField: false });
    const run = await installAndGetRun(makeSource());

    const recorder = makeRecorder();

    const subCtx: EffectContext = {
      source: offFieldSource,
      trigger: { removedFromSecuritySeat: 0 as Seat },
      game: {
        player: () => ({ battleArea: [] }) as never,
        opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
        permanentById: () => undefined,
        definitionOf: () => ({}) as never,
      } as never,
      fx: new Proxy({} as Primitives, {
        get: (_, verb: string) =>
          (...args: unknown[]) => {
            recorder.calls.push({ verb, args });
            return undefined;
          },
      }),
      ask: {} as never,
    };

    await run(subCtx);

    expect(recorder.calls.filter((c) => c.verb === "suspend")).toHaveLength(0);
    expect(recorder.calls.filter((c) => c.verb === "grantKeyword")).toHaveLength(0);
  });
});

// ── SecuritySkill: play self without paying cost ─────────────────────────────

describe("BT15-084 SecuritySkill behavior", () => {
  const mod = getEffectModule(cardId)!;

  it("calls playFromSecurity with payCost: false", async () => {
    const source = makeSource();
    const recorder = makeRecorder();
    const ctx = makeCtx({ recorder, source });

    const effects = mod.effectsForTiming(EffectTiming.SecuritySkill, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.isSecurity).toBe(true);

    await effects[0]!.resolve(ctx);

    const call = recorder.calls.find((c) => c.verb === "playFromSecurity");
    expect(call, "playFromSecurity must be called").toBeDefined();
    expect(call!.args[0]).toBe(source.instanceId);
    expect((call!.args[1] as { payCost?: boolean })?.payCost).toBe(false);
  });
});
