import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import "./EX12-028.js";

// A3 for EX12-028 (Gusokumon, EX12 Blue/Purple Lv.5):
//   [Static] ＜Blocker＞, ＜Decode＞
//   [Opponent's Turn] inherited: when opponent attacks, optional redirect to [DS] Digimon
//   [All Turns][Once Per Turn]: RESIDUAL (no "onAllyAttack" SubTriggerEventName in engine)

const cardId = "EX12-028";

let seq = 0;

function inst(cId: string, seat = 0): CardInstance {
  seq++;
  return { instanceId: `i${seq}`, cardId: cId, ownerSeat: seat, faceUp: true } as unknown as CardInstance;
}

function makePerm(opts: { cardId?: string; seat?: number } = {}): Permanent {
  seq++;
  return {
    permanentId: `p${seq}`,
    controllerSeat: opts.seat ?? 0,
    topCard: inst(opts.cardId ?? cardId, opts.seat ?? 0),
    stack: [],
    linked: [],
    baseDP: 10000,
    currentDP: 10000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(perm: Permanent | undefined, onField = true): CardSource {
  return {
    instanceId: "self",
    cardId,
    ownerSeat: 0,
    definition: undefined as never,
    permanent: () => perm,
    isOnBattleArea: () => onField,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

const requireMod = () => {
  const mod = getEffectModule(cardId);
  expect(mod, `${cardId} must be registered`).toBeDefined();
  return mod!;
};

// ── module registration ──────────────────────────────────────────────────────

describe("EX12-028 module structure", () => {
  it("registers as a hand-written module", () => {
    expect(requireMod().cardId).toBe(cardId);
  });

  it("returns 3 effects at EffectTiming.None (Blocker, Decode, redirect)", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.None, makeSource(makePerm()));
    expect(effects).toHaveLength(3);
    expect(effects[0]!.effectKey).toBe(`${cardId}/blocker`);
    expect(effects[1]!.effectKey).toBe(`${cardId}/decode`);
    expect(effects[2]!.effectKey).toBe(`${cardId}/opp-turn-redirect-attack`);
  });

  it("redirect attack effect is marked isInherited", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.None, makeSource(makePerm()));
    expect(effects[2]!.isInherited).toBe(true);
  });
});

// ── Static: Blocker + Decode grants ─────────────────────────────────────────

describe("EX12-028 static keyword grants", () => {
  it("grants Blocker keyword to self permanent", async () => {
    const self = makePerm();
    const source = makeSource(self);
    const granted: string[] = [];

    const ctx: EffectContext = {
      source,
      trigger: {},
      game: { player: () => ({ battleArea: [] } as never), opponentOf: (s: number) => (s === 0 ? 1 : 0), permanentById: () => undefined, definitionOf: () => undefined as never } as never,
      fx: { grantKeyword: (_pId: string, keyword: string) => { granted.push(keyword); } } as never,
      ask: {} as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    await effects[0]!.resolve(ctx);
    expect(granted).toContain("Blocker");
  });

  it("grants Decode keyword to self permanent", async () => {
    const self = makePerm();
    const source = makeSource(self);
    const granted: string[] = [];

    const ctx: EffectContext = {
      source,
      trigger: {},
      game: { player: () => ({ battleArea: [] } as never), opponentOf: (s: number) => (s === 0 ? 1 : 0), permanentById: () => undefined, definitionOf: () => undefined as never } as never,
      fx: { grantKeyword: (_pId: string, keyword: string) => { granted.push(keyword); } } as never,
      ask: {} as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    await effects[1]!.resolve(ctx);
    expect(granted).toContain("Decode");
  });
});

// ── [Opponent's Turn] inherited redirect ────────────────────────────────────

describe("EX12-028 redirect attack watcher install", () => {
  it("installs a whenOpponentAttacks sub-trigger watcher on resolve", async () => {
    const self = makePerm();
    const source = makeSource(self);
    const installedEvents: string[] = [];

    const ctx: EffectContext = {
      source,
      trigger: {},
      game: { player: () => ({ battleArea: [] } as never), opponentOf: (s: number) => (s === 0 ? 1 : 0), permanentById: () => undefined, definitionOf: () => undefined as never } as never,
      fx: {
        grantKeyword: () => {},
        subscribeSubTrigger: (sub: { event: string }) => { installedEvents.push(sub.event); return 0; },
      } as never,
      ask: {} as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    await effects[2]!.resolve(ctx);
    expect(installedEvents).toContain("whenOpponentAttacks");
  });

  it("redirects attack to [DS] Digimon when available", async () => {
    const self = makePerm();
    const source = makeSource(self);

    // Capture the installed sub-trigger run function
    let capturedRun: ((ctx: EffectContext) => Promise<void>) | undefined;

    const installCtx: EffectContext = {
      source,
      trigger: {},
      game: { player: () => ({ battleArea: [] } as never), opponentOf: (s: number) => (s === 0 ? 1 : 0), permanentById: () => undefined, definitionOf: () => undefined as never } as never,
      fx: {
        grantKeyword: () => {},
        subscribeSubTrigger: (sub: { run: (ctx: EffectContext) => Promise<void> }) => { capturedRun = sub.run; return 0; },
      } as never,
      ask: {} as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    await effects[2]!.resolve(installCtx);

    expect(capturedRun).toBeDefined();

    // Now simulate the sub-trigger firing.
    const dsPerm = makePerm({ cardId: "EX12-028", seat: 0 });
    const redirected: string[][] = [];

    const subCtx: EffectContext = {
      source: {
        ...source,
        permanent: () => self,
        isOnBattleArea: () => true,
      },
      trigger: {},
      game: {
        player: (seat: number) => {
          if (seat === 0) return { battleArea: [dsPerm] } as never;
          return { battleArea: [] } as never;
        },
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: (c: CardInstance) => {
          // Simulate DS trait
          return { types: ["DS"], kinds: ["Digimon"] } as never;
        },
      } as never,
      fx: {
        redirectAttack: (candidates: string[]) => { redirected.push(candidates); return Promise.resolve(); },
      } as never,
      ask: {} as never,
    };

    await capturedRun!(subCtx);
    expect(redirected.flat()).toContain(dsPerm.permanentId);
  });

  it("skips redirect when no [DS] Digimon available", async () => {
    const self = makePerm();
    const source = makeSource(self);

    let capturedRun: ((ctx: EffectContext) => Promise<void>) | undefined;

    const installCtx: EffectContext = {
      source,
      trigger: {},
      game: { player: () => ({ battleArea: [] } as never), opponentOf: (s: number) => (s === 0 ? 1 : 0), permanentById: () => undefined, definitionOf: () => undefined as never } as never,
      fx: {
        grantKeyword: () => {},
        subscribeSubTrigger: (sub: { run: (ctx: EffectContext) => Promise<void> }) => { capturedRun = sub.run; return 0; },
      } as never,
      ask: {} as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    await effects[2]!.resolve(installCtx);

    const redirected: string[][] = [];
    const subCtx: EffectContext = {
      source: { ...source, isOnBattleArea: () => true },
      trigger: {},
      game: {
        player: () => ({ battleArea: [] } as never),
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: () => ({ types: [], kinds: ["Digimon"] } as never),
      } as never,
      fx: {
        redirectAttack: (candidates: string[]) => { redirected.push(candidates); return Promise.resolve(); },
      } as never,
      ask: {} as never,
    };

    await capturedRun!(subCtx);
    expect(redirected).toHaveLength(0);
  });
});

// ── RESIDUAL: AllTurns sub-trigger ────────────────────────────────────────────

describe("EX12-028 [All Turns] RESIDUAL", () => {
  it("does not emit effects for OnAllyAttack timing (RESIDUAL — no onAllyAttack event)", () => {
    // The AllTurns "when any of your Digimon attacks" is a residual because the engine
    // lacks an onAllyAttack SubTriggerEventName. No effects emitted for this timing.
    const effects = requireMod().effectsForTiming(EffectTiming.OnAllyAttack, makeSource(makePerm()));
    expect(effects).toHaveLength(0);
  });
});
