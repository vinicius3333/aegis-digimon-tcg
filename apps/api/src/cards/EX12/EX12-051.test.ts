import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import "./EX12-051.js";

// A3 for EX12-051 (Lamortmon, EX12 Purple Lv.6):
//   ＜Reboot＞, ＜Blocker＞ (Static)
//   [On Play]: suspend 1 opponent Digimon/Tamer, de-digivolve 1 opponent Digimon by 1.
//   [When Digivolving]: same as On Play.
//   [All Turns][Once Per Turn] inherited: when this Digimon (with [Angoramon] in its text or
//     the [NSp] trait) wins a battle, trash your opponent's top security card. Now wired to
//     the live "whenBattleWon" SubTrigger event (combat/controller.ts).

const cardId = "EX12-051";

let seq = 0;

function inst(cId: string, seat = 0): CardInstance {
  seq++;
  return { instanceId: `i${seq}`, cardId: cId, ownerSeat: seat, faceUp: true } as unknown as CardInstance;
}

function makePerm(opts: { cardId?: string; seat?: number; level?: number } = {}): Permanent {
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

function makeSource(perm: Permanent | undefined, onField = true, ownersTurn = true): CardSource {
  return {
    instanceId: "self",
    cardId,
    ownerSeat: 0,
    definition: undefined as never,
    permanent: () => perm,
    isOnBattleArea: () => onField,
    isOwnersTurn: () => ownersTurn,
    hasColor: () => false,
  };
}

const requireMod = () => {
  const mod = getEffectModule(cardId);
  expect(mod, `${cardId} must be registered`).toBeDefined();
  return mod!;
};

// ── module registration ──────────────────────────────────────────────────────

describe("EX12-051 module structure", () => {
  it("registers as a hand-written module", () => {
    expect(requireMod().cardId).toBe(cardId);
  });

  it("returns 3 effects at EffectTiming.None (Reboot + Blocker + whenBattleWon watcher install)", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.None, makeSource(makePerm()));
    expect(effects).toHaveLength(3);
    expect(effects[0]!.effectKey).toBe(`${cardId}/reboot`);
    expect(effects[1]!.effectKey).toBe(`${cardId}/blocker`);
    expect(effects[2]!.effectKey).toBe(`${cardId}/when-battle-won-trash-security`);
  });

  it("returns 1 effect at OnPlay", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, makeSource(makePerm()));
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/on-play-suspend-dedigivolve`);
  });

  it("returns 1 effect at WhenDigivolving", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.WhenDigivolving, makeSource(makePerm()));
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/when-digivolving-suspend-dedigivolve`);
  });
});

// ── Static: Reboot + Blocker grants ─────────────────────────────────────────

describe("EX12-051 static keyword grants", () => {
  it("Reboot: grants Reboot keyword to self permanent", async () => {
    const self = makePerm();
    const source = makeSource(self);
    const granted: { permanentId: string; keyword: string }[] = [];
    const ctx: EffectContext = {
      source,
      trigger: {},
      game: {
        player: () => ({ battleArea: [] } as never),
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: () => undefined as never,
      } as never,
      fx: {
        grantKeyword: (permanentId: string, keyword: string) => {
          granted.push({ permanentId, keyword });
        },
      } as never,
      ask: {} as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    await effects[0]!.resolve(ctx);
    expect(granted).toContainEqual({ permanentId: self.permanentId, keyword: "Reboot" });
  });

  it("Blocker: grants Blocker keyword to self permanent", async () => {
    const self = makePerm();
    const source = makeSource(self);
    const granted: { permanentId: string; keyword: string }[] = [];
    const ctx: EffectContext = {
      source,
      trigger: {},
      game: {
        player: () => ({ battleArea: [] } as never),
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: () => undefined as never,
      } as never,
      fx: {
        grantKeyword: (permanentId: string, keyword: string) => {
          granted.push({ permanentId, keyword });
        },
      } as never,
      ask: {} as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    await effects[1]!.resolve(ctx);
    expect(granted).toContainEqual({ permanentId: self.permanentId, keyword: "Blocker" });
  });
});

// ── [On Play]: suspend + de-digivolve ────────────────────────────────────────

describe("EX12-051 On Play: suspend 1 opponent Digimon/Tamer + de-digivolve 1 opponent Digimon", () => {
  it("suspends the only opponent Digimon and de-digivolves it", async () => {
    const self = makePerm();
    const oppDigimon = makePerm({ seat: 1, cardId: "BT1-010" });
    const source = makeSource(self);

    const suspended: string[][] = [];
    const deDigivolved: { permanentId: string; n: number }[] = [];

    const ctx: EffectContext = {
      source,
      trigger: {},
      game: {
        player: (seat: number) => {
          if (seat === 0) return { battleArea: [self] } as never;
          return { battleArea: [oppDigimon] } as never;
        },
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: (c: CardInstance) => {
          return { kinds: ["Digimon"], level: 5 } as never;
        },
      } as never,
      fx: {
        suspend: (ids: string[]) => { suspended.push(ids); return Promise.resolve(ids); },
        deDigivolve: (permanentId: string, n: number) => {
          deDigivolved.push({ permanentId, n });
          return [];
        },
      } as never,
      ask: {
        chooseTargets: async (_ctx: unknown, opts: { candidates: string[] }) => [opts.candidates[0]!],
      } as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(ctx);

    expect(suspended.flat()).toContain(oppDigimon.permanentId);
    expect(deDigivolved).toContainEqual({ permanentId: oppDigimon.permanentId, n: 1 });
  });

  it("does nothing when opponent has no Digimon or Tamers", async () => {
    const self = makePerm();
    const source = makeSource(self);

    const suspended: string[][] = [];
    const ctx: EffectContext = {
      source,
      trigger: {},
      game: {
        player: (seat: number) => {
          if (seat === 0) return { battleArea: [] } as never;
          return { battleArea: [] } as never;
        },
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: () => ({ kinds: ["Digimon"] } as never),
      } as never,
      fx: {
        suspend: (ids: string[]) => { suspended.push(ids); return Promise.resolve(ids); },
        deDigivolve: () => [],
      } as never,
      ask: {} as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(ctx);
    expect(suspended).toHaveLength(0);
  });
});

// ── [When Digivolving]: same body as [On Play] ───────────────────────────────

describe("EX12-051 When Digivolving: same suspend + de-digivolve", () => {
  it("suspends + de-digivolves from WhenDigivolving window", async () => {
    const self = makePerm();
    const oppDigimon = makePerm({ seat: 1, cardId: "BT1-010" });
    const source = makeSource(self);

    const suspended: string[][] = [];
    const deDigivolved: { permanentId: string; n: number }[] = [];

    const ctx: EffectContext = {
      source,
      trigger: {},
      game: {
        player: (seat: number) => {
          if (seat === 1) return { battleArea: [oppDigimon] } as never;
          return { battleArea: [] } as never;
        },
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: () => ({ kinds: ["Digimon"] } as never),
      } as never,
      fx: {
        suspend: (ids: string[]) => { suspended.push(ids); return Promise.resolve(ids); },
        deDigivolve: (permanentId: string, n: number) => {
          deDigivolved.push({ permanentId, n });
          return [];
        },
      } as never,
      ask: {
        chooseTargets: async (_ctx: unknown, opts: { candidates: string[] }) => [opts.candidates[0]!],
      } as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);

    expect(suspended.flat()).toContain(oppDigimon.permanentId);
    expect(deDigivolved).toHaveLength(1);
  });
});

// ── [All Turns][Once Per Turn] inherited: whenBattleWon -> trash opponent's top security ────

describe("EX12-051 whenBattleWon watcher installation and gate", () => {
  function makeInstallCtx(self: Permanent, calls: { install?: unknown }) {
    const source = makeSource(self);
    const ctx: EffectContext = {
      source,
      trigger: {},
      game: {
        player: () => ({ battleArea: [] } as never),
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: (id: string) => (id === self.permanentId ? self : undefined),
        definitionOf: () => undefined as never,
      } as never,
      fx: {
        subscribeSubTrigger: (install: unknown) => {
          calls.install = install;
          return 0;
        },
      } as never,
      ask: {} as never,
    };
    return { source, ctx };
  }

  it("installs a whenBattleWon watcher, once-per-turn keyed, anchored on self", async () => {
    const self = makePerm();
    const calls: { install?: unknown } = {};
    const { ctx } = makeInstallCtx(self, calls);

    const effects = requireMod().effectsForTiming(EffectTiming.None, makeSource(self));
    await effects[2]!.resolve(ctx);

    const install = calls.install as {
      event: string;
      sourcePermanentId: string;
      oncePerTurnKey?: string;
      matches: (subCtx: EffectContext) => boolean;
    };
    expect(install.event).toBe("whenBattleWon");
    expect(install.sourcePermanentId).toBe(self.permanentId);
    expect(install.oncePerTurnKey).toBeDefined();
  });

  it("matches when THIS permanent (with the NSp trait) is the battle winner", async () => {
    const self = makePerm();
    const calls: { install?: unknown } = {};
    const { ctx, source } = makeInstallCtx(self, calls);
    (ctx.game as unknown as { definitionOf: (c: CardInstance) => unknown }).definitionOf = () =>
      ({ nameEn: "Lamortmon", types: ["NSp"] } as never);

    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    await effects[2]!.resolve(ctx);

    const install = calls.install as { matches: (subCtx: EffectContext) => boolean };
    const subCtx = { ...ctx, trigger: { subjectPermanentId: self.permanentId } } as EffectContext;
    // FAILS-WHEN-REVERTED: revert this watcher to the omitted-subscription RESIDUAL state =>
    // subscribeSubTrigger is never called => `install` stays undefined => this throws => RED.
    expect(install.matches(subCtx)).toBe(true);
  });

  it("does NOT match when a DIFFERENT permanent wins the battle", async () => {
    const self = makePerm();
    const other = makePerm({ seat: 0 });
    const calls: { install?: unknown } = {};
    const { ctx, source } = makeInstallCtx(self, calls);

    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    await effects[2]!.resolve(ctx);

    const install = calls.install as { matches: (subCtx: EffectContext) => boolean };
    const subCtx = { ...ctx, trigger: { subjectPermanentId: other.permanentId } } as EffectContext;
    expect(install.matches(subCtx)).toBe(false);
  });

  it("does NOT match when the winning permanent lacks BOTH the Angoramon text and NSp trait", async () => {
    const self = makePerm();
    const calls: { install?: unknown } = {};
    const { ctx, source } = makeInstallCtx(self, calls);
    (ctx.game as unknown as { definitionOf: (c: CardInstance) => unknown }).definitionOf = () =>
      ({ nameEn: "SomeOtherDigimon", types: [] } as never);

    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    await effects[2]!.resolve(ctx);

    const install = calls.install as { matches: (subCtx: EffectContext) => boolean };
    const subCtx = { ...ctx, trigger: { subjectPermanentId: self.permanentId } } as EffectContext;
    expect(install.matches(subCtx)).toBe(false);
  });

  it("run() trashes 1 card from the opponent's top security", async () => {
    const self = makePerm();
    const calls: { install?: unknown } = {};
    const { ctx, source } = makeInstallCtx(self, calls);

    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    await effects[2]!.resolve(ctx);

    const trashCalls: { seat: number; n: number; opts?: unknown }[] = [];
    const install = calls.install as { run: (subCtx: EffectContext) => Promise<void> };
    const subCtx = {
      ...ctx,
      fx: {
        trashFromSecurity: async (seat: number, n: number, opts?: unknown) => {
          trashCalls.push({ seat, n, opts });
          return [];
        },
      } as never,
    } as EffectContext;
    await install.run(subCtx);

    expect(trashCalls).toEqual([{ seat: 1, n: 1, opts: { fromTop: true } }]);
  });
});
