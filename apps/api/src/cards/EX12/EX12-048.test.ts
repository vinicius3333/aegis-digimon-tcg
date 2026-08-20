import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import "./EX12-048.js";
import { hasGokuumonOrSW } from "./EX12-048.js";

// A3 for EX12-048 (SeitenGokuumon, EX12 Red Lv.7):
//   [Static] ＜Rush＞, ＜Raid＞, ＜Piercing＞, ＜Security Attack +1＞
//   [On Play] / [When Digivolving]: -8000 DP (+ -3000 per Lv.5 stack) on 1 opp Digimon + optional attack
//   [All Turns] RESIDUAL: leave-play replacement (needs "run-then-depart" mode)

const cardId = "EX12-048";

let seq = 0;

function inst(cId: string, seat = 0, _level?: number): CardInstance {
  seq++;
  return { instanceId: `i${seq}`, cardId: cId, ownerSeat: seat, faceUp: true } as unknown as CardInstance;
}

function makePerm(opts: { cardId?: string; seat?: number; stackLevels?: number[] } = {}): Permanent {
  seq++;
  const stackCards = (opts.stackLevels ?? []).map((lvl) => {
    seq++;
    return { instanceId: `stack-i${seq}`, cardId: `LV${lvl}-CARD`, ownerSeat: opts.seat ?? 0, faceUp: true } as unknown as CardInstance;
  });
  return {
    permanentId: `p${seq}`,
    controllerSeat: opts.seat ?? 0,
    topCard: inst(opts.cardId ?? cardId, opts.seat ?? 0),
    stack: stackCards,
    linked: [],
    baseDP: 17000,
    currentDP: 17000,
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

describe("EX12-048 module structure", () => {
  it("registers as a hand-written module", () => {
    expect(requireMod().cardId).toBe(cardId);
  });

  it("returns keyword grants plus the live leave-play replacement", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.None, makeSource(makePerm()));
    expect(effects).toHaveLength(5);
    expect(effects[0]!.effectKey).toBe(`${cardId}/rush`);
    expect(effects[1]!.effectKey).toBe(`${cardId}/raid`);
    expect(effects[2]!.effectKey).toBe(`${cardId}/piercing`);
    expect(effects[3]!.effectKey).toBe(`${cardId}/security-attack`);
    expect(effects[4]!.effectKey).toBe(`${cardId}/would-leave-play-digivolution-cards`);
  });

  it("returns 1 effect at OnPlay", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, makeSource(makePerm()));
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/on-play-dp-attack`);
  });

  it("returns 1 effect at WhenDigivolving", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.WhenDigivolving, makeSource(makePerm()));
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/when-digivolving-dp-attack`);
  });
});

// ── hasGokuumonOrSW helper ───────────────────────────────────────────────────

describe("hasGokuumonOrSW helper", () => {
  it("returns true for a card with Gokuumon in nameEn", () => {
    const def = { nameEn: "Gokuumon", kinds: ["Digimon"], colors: [], playCost: 5, dp: 4000, evoCosts: [], maxCountInDeck: 4, set: "T" } as never;
    expect(hasGokuumonOrSW(def)).toBe(true);
  });

  it("returns true for a card with SW trait", () => {
    const def = { nameEn: "SomeCard", types: ["SW"], kinds: ["Digimon"], colors: [], playCost: 5, dp: 4000, evoCosts: [], maxCountInDeck: 4, set: "T" } as never;
    expect(hasGokuumonOrSW(def)).toBe(true);
  });

  it("returns false for an unrelated card", () => {
    const def = { nameEn: "Agumon", types: ["Dragon"], kinds: ["Digimon"], colors: [], playCost: 3, dp: 2000, evoCosts: [], maxCountInDeck: 4, set: "T" } as never;
    expect(hasGokuumonOrSW(def)).toBe(false);
  });
});

// ── [On Play]: DP reduction + optional attack ────────────────────────────────

describe("EX12-048 On Play: DP reduction on opponent Digimon + optional attack", () => {
  it("applies -8000 DP to the only opponent Digimon", async () => {
    const self = makePerm();
    const source = makeSource(self);
    const oppDigimon = makePerm({ seat: 1, cardId: "BT1-010" });

    const dpMods: { permanentId: string; delta: number }[] = [];
    const forced: string[] = [];

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
          if (c.cardId === "BT1-010") return { kinds: ["Digimon"], level: 5 } as never;
          if (c.cardId === cardId) return { kinds: ["Digimon"], level: 7 } as never;
          return { kinds: ["Digimon"] } as never;
        },
      } as never,
      fx: {
        modifyDP: (permanentId: string, delta: number) => { dpMods.push({ permanentId, delta }); },
        forceAttack: (permanentId: string) => { forced.push(permanentId); return Promise.resolve(); },
      } as never,
      ask: {
        chooseTargets: async (_ctx: unknown, opts: { candidates: string[] }) => [opts.candidates[0]!],
        optional: async () => true,
      } as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(ctx);

    expect(dpMods.some((m) => m.permanentId === oppDigimon.permanentId && m.delta === -8000)).toBe(true);
    expect(forced).toContain(self.permanentId);
  });

  it("applies additional -3000 DP per Lv.5 digivolution card in THIS Digimon's stack", async () => {
    // Permanent with 2 Lv.5 stack cards → total extra = -6000 DP.
    const self = makePerm({ stackLevels: [5, 5] });
    const source = makeSource(self);
    const oppDigimon = makePerm({ seat: 1, cardId: "BT1-010" });

    const dpMods: { permanentId: string; delta: number }[] = [];

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
          if (c.cardId.startsWith("LV5")) return { kinds: ["Digimon"], level: 5 } as never;
          if (c.cardId === "BT1-010") return { kinds: ["Digimon"], level: 5 } as never;
          return { kinds: ["Digimon"] } as never;
        },
      } as never,
      fx: {
        modifyDP: (permanentId: string, delta: number) => { dpMods.push({ permanentId, delta }); },
        forceAttack: () => Promise.resolve(),
      } as never,
      ask: {
        chooseTargets: async (_ctx: unknown, opts: { candidates: string[] }) => [opts.candidates[0]!],
        optional: async () => false, // decline the attack
      } as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(ctx);

    const extraMods = dpMods.filter((m) => m.permanentId === oppDigimon.permanentId && m.delta === -6000);
    expect(extraMods.length).toBeGreaterThan(0);
  });

  it("skips attack when player declines", async () => {
    const self = makePerm();
    const source = makeSource(self);
    const oppDigimon = makePerm({ seat: 1, cardId: "BT1-010" });
    const forced: string[] = [];

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
        definitionOf: () => ({ kinds: ["Digimon"] } as never),
      } as never,
      fx: {
        modifyDP: () => {},
        forceAttack: (permanentId: string) => { forced.push(permanentId); return Promise.resolve(); },
      } as never,
      ask: {
        chooseTargets: async (_ctx: unknown, opts: { candidates: string[] }) => [opts.candidates[0]!],
        optional: async () => false,
      } as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(ctx);
    expect(forced).toHaveLength(0);
  });
});

// ── RESIDUAL: AllTurns leave-play replacement ────────────────────────────────

describe("EX12-048 [All Turns] RESIDUAL", () => {
  it("does not emit effects at OnLeaveFieldAnyone (leave-play replacement is RESIDUAL)", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.OnLeaveFieldAnyone, makeSource(makePerm()));
    expect(effects).toHaveLength(0);
  });
});
