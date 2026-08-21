import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import "./EX10-056.js";

// A3 for EX10-056 (Bagramon, EX10 DigiXros):
//   [On Play] / [When Digivolving]: optional relocate 1 opponent Digimon under another
//   [All Turns] (installed from OnPlay/WhenDigivolving): subscribeSubTrigger for
//     whenOneOfYoursDigivolves + onAddDigivolutionCards → cost: trash 2 digivolution cards → trash opp security
//   Both watcher subscriptions share one once-per-turn key, including across event types.

const cardId = "EX10-056";

let seq = 0;

function inst(cId: string, seat = 0): CardInstance {
  seq++;
  return { instanceId: `i${seq}`, cardId: cId, ownerSeat: seat, faceUp: true } as unknown as CardInstance;
}

function makeStackPerm(opts: { cardId?: string; seat?: number; stackCount?: number } = {}): Permanent {
  seq++;
  const stackCards = Array.from({ length: opts.stackCount ?? 0 }, () => inst("STACK-CARD"));
  return {
    permanentId: `p${seq}`,
    controllerSeat: opts.seat ?? 0,
    topCard: inst(opts.cardId ?? cardId, opts.seat ?? 0),
    stack: stackCards,
    linked: [],
    baseDP: 13000,
    currentDP: 13000,
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

describe("EX10-056 module structure", () => {
  it("registers as a hand-written module", () => {
    expect(requireMod().cardId).toBe(cardId);
  });

  it("returns 1 effect at OnPlay", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, makeSource(makeStackPerm()));
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/on-play-relocate`);
    expect(effects[0]!.optional).toBe(true);
  });

  it("returns 1 effect at WhenDigivolving", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.WhenDigivolving, makeSource(makeStackPerm()));
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/when-digivolving-relocate`);
    expect(effects[0]!.optional).toBe(true);
  });
});

// ── [On Play]: relocate opponent Digimon ─────────────────────────────────────

describe("EX10-056 On Play: relocate opponent Digimon", () => {
  it("relocates opponent Digimon under the other opponent Digimon", async () => {
    const self = makeStackPerm({ stackCount: 2 });
    const source = makeSource(self);

    const oppDigimon1 = makeStackPerm({ seat: 1, cardId: "BT1-010" }); // source to relocate
    const oppDigimon2 = makeStackPerm({ seat: 1, cardId: "BT1-011" }); // dest

    const relocated: { dest: string; src: string }[] = [];
    const installedEvents: { event: string; oncePerTurnKey?: string }[] = [];

    const ctx: EffectContext = {
      source,
      trigger: {},
      game: {
        player: (seat: number) => {
          if (seat === 0) return { battleArea: [self] } as never;
          return { battleArea: [oppDigimon1, oppDigimon2] } as never;
        },
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: (pid: string) => {
          if (pid === self.permanentId) return self;
          if (pid === oppDigimon1.permanentId) return oppDigimon1;
          if (pid === oppDigimon2.permanentId) return oppDigimon2;
          return undefined;
        },
        definitionOf: () => ({ kinds: ["Digimon"] }) as never,
      } as never,
      fx: {
        relocatePermanent: (dest: string, src: string) => {
          relocated.push({ dest, src });
          return true;
        },
        subscribeSubTrigger: (sub: { event: string; oncePerTurnKey?: string }) => {
          installedEvents.push(sub);
          return 0;
        },
      } as never,
      ask: {
        optional: async () => true,
        chooseTargets: async (_ctx: unknown, opts: { candidates: string[] }) => [opts.candidates[0]!],
      } as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(ctx);

    // Should have relocated one Digimon under another.
    expect(relocated.length).toBeGreaterThan(0);
    // Sub-triggers should have been installed.
    expect(installedEvents.map(({ event }) => event)).toContain("whenOneOfYoursDigivolves");
    expect(installedEvents.map(({ event }) => event)).toContain("onAddDigivolutionCards");
    expect(new Set(installedEvents.map(({ oncePerTurnKey }) => oncePerTurnKey))).toEqual(
      new Set(["EX10-056/AllTurns"]),
    );
  });

  it("installs sub-triggers even when no opponent Digimon to relocate", async () => {
    const self = makeStackPerm({ stackCount: 2 });
    const source = makeSource(self);

    const installedEvents: string[] = [];

    const ctx: EffectContext = {
      source,
      trigger: {},
      game: {
        player: (_seat: number) => ({ battleArea: [self] }) as never,
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: () => ({ kinds: ["Digimon"] }) as never,
      } as never,
      fx: {
        relocatePermanent: () => true,
        subscribeSubTrigger: (sub: { event: string }) => {
          installedEvents.push(sub.event);
          return 0;
        },
      } as never,
      ask: {
        optional: async () => true,
        chooseTargets: async () => [],
      } as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(ctx);

    expect(installedEvents).toContain("whenOneOfYoursDigivolves");
    expect(installedEvents).toContain("onAddDigivolutionCards");
  });
});

// ── [All Turns] sub-trigger: trash cost + trash security ────────────────────

describe("EX10-056 AllTurns sub-trigger body: trash 2 digivolution → trash opp security", () => {
  it("captures and fires the whenOneOfYoursDigivolves watcher to trash security", async () => {
    const self = makeStackPerm({ stackCount: 3 });
    const source = makeSource(self);

    let capturedRun: ((ctx: EffectContext) => Promise<void>) | undefined;

    const installCtx: EffectContext = {
      source,
      trigger: {},
      game: {
        player: () => ({ battleArea: [] }) as never,
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: (pid: string) => (pid === self.permanentId ? self : undefined),
        definitionOf: () => ({ kinds: ["Digimon"] }) as never,
      } as never,
      fx: {
        relocatePermanent: () => true,
        subscribeSubTrigger: (sub: { event: string; run: (ctx: EffectContext) => Promise<void> }) => {
          if (sub.event === "whenOneOfYoursDigivolves") capturedRun = sub.run;
          return 0;
        },
      } as never,
      ask: {
        optional: async () => true,
        chooseTargets: async () => [],
      } as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(installCtx);

    expect(capturedRun).toBeDefined();

    // Now fire the sub-trigger.
    const trashedDigivolveCards: { hostId: string; ids: string[] }[] = [];
    const trashedSecurity: { seat: number; n: number }[] = [];

    const oppDigimon = makeStackPerm({ seat: 1 });

    const subCtx: EffectContext = {
      source,
      trigger: { subjectPermanentId: oppDigimon.permanentId },
      game: {
        player: () => ({ battleArea: [] }) as never,
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: (pid: string) => {
          if (pid === self.permanentId) return self;
          if (pid === oppDigimon.permanentId) return oppDigimon;
          return undefined;
        },
        definitionOf: () => ({ kinds: ["Digimon"] }) as never,
      } as never,
      fx: {
        trashDigivolutionCards: (hostId: string, ids: string[]) => {
          trashedDigivolveCards.push({ hostId, ids });
          return Promise.resolve([]);
        },
        trashFromSecurity: (seat: number, n: number) => {
          trashedSecurity.push({ seat, n });
          return Promise.resolve([]);
        },
      } as never,
      ask: {
        optional: async () => true,
        selectCards: async (_ctx: unknown, opts: { candidates: string[] }) => opts.candidates.slice(0, 2),
      } as never,
    };

    await capturedRun!(subCtx);

    expect(trashedDigivolveCards.length).toBeGreaterThan(0);
    expect(trashedDigivolveCards[0]!.hostId).toBe(self.permanentId);
    expect(trashedDigivolveCards[0]!.ids).toHaveLength(2);
    expect(trashedSecurity).toContainEqual({ seat: 1, n: 1 });
  });

  it("does not trash security when player declines", async () => {
    const self = makeStackPerm({ stackCount: 2 });
    const source = makeSource(self);

    let capturedRun: ((ctx: EffectContext) => Promise<void>) | undefined;

    const installCtx: EffectContext = {
      source,
      trigger: {},
      game: {
        player: () => ({ battleArea: [] }) as never,
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: (pid: string) => (pid === self.permanentId ? self : undefined),
        definitionOf: () => ({ kinds: ["Digimon"] }) as never,
      } as never,
      fx: {
        relocatePermanent: () => true,
        subscribeSubTrigger: (sub: { event: string; run: (ctx: EffectContext) => Promise<void> }) => {
          if (sub.event === "whenOneOfYoursDigivolves") capturedRun = sub.run;
          return 0;
        },
      } as never,
      ask: {
        optional: async () => true,
        chooseTargets: async () => [],
      } as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(installCtx);

    const trashedSecurity: unknown[] = [];
    const oppDigimon = makeStackPerm({ seat: 1 });

    const subCtx: EffectContext = {
      source,
      trigger: { subjectPermanentId: oppDigimon.permanentId },
      game: {
        player: () => ({ battleArea: [] }) as never,
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: (pid: string) => {
          if (pid === self.permanentId) return self;
          if (pid === oppDigimon.permanentId) return oppDigimon;
          return undefined;
        },
        definitionOf: () => ({ kinds: ["Digimon"] }) as never,
      } as never,
      fx: {
        trashFromSecurity: (n: unknown) => {
          trashedSecurity.push(n);
          return Promise.resolve([]);
        },
      } as never,
      ask: {
        optional: async () => false, // decline
      } as never,
    };

    await capturedRun!(subCtx);
    expect(trashedSecurity).toHaveLength(0);
  });
});
