import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import "./EX12-059.js";

// A3 for EX12-059 (Machinedramon, EX12 Black Lv.6):
//   [Static] ＜Reboot＞, ＜Fragment(2)＞
//   [On Play] / [When Digivolving] / [When Attacking]: place 2 Machine/Cyborg/ME ≤Lv5 →
//     de-digivolve opp by 3 + stack-trash lock (optional primitive).

const cardId = "EX12-059";

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
    baseDP: 12000,
    currentDP: 12000,
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

/** Minimal card definition for a Lv.5 Machine Digimon. */
function machineDef(id: string): CardDefinition {
  return {
    cardId: id,
    set: "T",
    nameEn: id,
    kinds: ["Digimon"] as never,
    colors: ["Black"] as never,
    playCost: 6,
    dp: 7000,
    level: 5,
    types: ["Machine"],
    evoCosts: [],
    maxCountInDeck: 4,
  } as unknown as CardDefinition;
}

/** Minimal card definition for a Lv.6 Digimon (out-of-range for cost). */
function lv6Def(id: string): CardDefinition {
  return {
    cardId: id,
    set: "T",
    nameEn: id,
    kinds: ["Digimon"] as never,
    colors: ["Black"] as never,
    playCost: 12,
    dp: 12000,
    level: 6,
    types: ["Machine"],
    evoCosts: [],
    maxCountInDeck: 4,
  } as unknown as CardDefinition;
}

const requireMod = () => {
  const mod = getEffectModule(cardId);
  expect(mod, `${cardId} must be registered`).toBeDefined();
  return mod!;
};

// ── module registration ──────────────────────────────────────────────────────

describe("EX12-059 module structure", () => {
  it("registers as a hand-written module", () => {
    expect(requireMod().cardId).toBe(cardId);
  });

  it("returns 2 effects at EffectTiming.None (Reboot + Fragment)", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.None, makeSource(makePerm()));
    expect(effects).toHaveLength(2);
    expect(effects[0]!.effectKey).toBe(`${cardId}/reboot`);
    expect(effects[1]!.effectKey).toBe(`${cardId}/fragment`);
  });

  it("returns 1 effect at OnPlay", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, makeSource(makePerm()));
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/on-play-place-dedigivolve`);
  });

  it("returns 1 effect at WhenDigivolving", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.WhenDigivolving, makeSource(makePerm()));
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/when-digivolving-place-dedigivolve`);
  });

  it("returns 1 effect at OnUseAttack with maxPerTurn 1", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.OnUseAttack, makeSource(makePerm()));
    expect(effects).toHaveLength(1);
    expect(effects[0]!.maxPerTurn).toBe(1);
  });
});

// ── Static keyword grants ────────────────────────────────────────────────────

describe("EX12-059 static keyword grants", () => {
  it("grants Reboot to self permanent", async () => {
    const self = makePerm();
    const source = makeSource(self);
    const granted: { keyword: string }[] = [];
    const ctx: EffectContext = {
      source,
      trigger: {},
      game: { player: () => ({ battleArea: [] } as never), opponentOf: (s: number) => (s === 0 ? 1 : 0), permanentById: () => undefined, definitionOf: () => undefined as never } as never,
      fx: { grantKeyword: (_pId: string, keyword: string) => { granted.push({ keyword }); } } as never,
      ask: {} as never,
    };
    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    await effects[0]!.resolve(ctx);
    expect(granted.some((g) => g.keyword === "Reboot")).toBe(true);
  });

  it("grants Fragment with amount 2 to self permanent", async () => {
    const self = makePerm();
    const source = makeSource(self);
    const granted: { keyword: string; amount?: number }[] = [];
    const ctx: EffectContext = {
      source,
      trigger: {},
      game: { player: () => ({ battleArea: [] } as never), opponentOf: (s: number) => (s === 0 ? 1 : 0), permanentById: () => undefined, definitionOf: () => undefined as never } as never,
      fx: { grantKeyword: (_pId: string, keyword: string, _dur: unknown, amount?: number) => { granted.push({ keyword, amount }); } } as never,
      ask: {} as never,
    };
    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    await effects[1]!.resolve(ctx);
    expect(granted).toContainEqual({ keyword: "Fragment", amount: 2 });
  });
});

// ── [On Play]: place + dedigivolve ───────────────────────────────────────────

describe("EX12-059 On Play: place 2 + de-digivolve opp by 3", () => {
  it("places 2 Machine/Cyborg/ME cards and de-digivolves opponent by 3", async () => {
    const self = makePerm();
    const source = makeSource(self);

    const card1 = inst("MACHINE-001");
    const card2 = inst("MACHINE-002");
    const oppDigimon = makePerm({ seat: 1 });

    const placed: { target: string; ids: string[] }[] = [];
    const deDigivolved: { permanentId: string; n: number }[] = [];

    const ctx: EffectContext = {
      source,
      trigger: {},
      game: {
        player: (seat: number) => {
          if (seat === 0) return { hand: [card1, card2], trash: [], battleArea: [self] } as never;
          return { battleArea: [oppDigimon], hand: [], trash: [] } as never;
        },
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: (c: CardInstance) => {
          if (c.cardId === "MACHINE-001" || c.cardId === "MACHINE-002") return machineDef(c.cardId);
          if (c.cardId === cardId) return { kinds: ["Digimon"], level: 6 } as never;
          return { kinds: ["Digimon"] } as never;
        },
      } as never,
      fx: {
        placeUnder: (targetPermanentId: string, ids: string[]) => {
          placed.push({ target: targetPermanentId, ids });
          return Promise.resolve([]);
        },
        deDigivolve: (permanentId: string, n: number) => {
          deDigivolved.push({ permanentId, n });
          return [];
        },
        stackTrashLock: undefined,
      } as never,
      ask: {
        selectCards: async (_ctx: unknown, opts: { candidates: string[] }) =>
          opts.candidates.slice(0, 2),
        chooseTargets: async (_ctx: unknown, opts: { candidates: string[] }) =>
          [opts.candidates[0]!],
      } as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(ctx);

    expect(placed.length).toBeGreaterThan(0);
    expect(placed[0]!.target).toBe(self.permanentId);
    expect(placed[0]!.ids).toHaveLength(2);
    expect(deDigivolved).toContainEqual({ permanentId: oppDigimon.permanentId, n: 3 });
  });

  it("does nothing when fewer than 2 eligible cards available", async () => {
    const self = makePerm();
    const source = makeSource(self);

    const card1 = inst("MACHINE-001");
    // Only 1 candidate → cost unmet

    const placed: string[] = [];

    const ctx: EffectContext = {
      source,
      trigger: {},
      game: {
        player: (seat: number) => {
          if (seat === 0) return { hand: [card1], trash: [], battleArea: [] } as never;
          return { battleArea: [], hand: [], trash: [] } as never;
        },
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: (c: CardInstance) => {
          if (c.cardId === "MACHINE-001") return machineDef(c.cardId);
          return { kinds: ["Digimon"] } as never;
        },
      } as never,
      fx: {
        placeUnder: (_target: string, ids: string[]) => { placed.push(...ids); return Promise.resolve([]); },
        deDigivolve: () => [],
        stackTrashLock: undefined,
      } as never,
      ask: {} as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(ctx);
    expect(placed).toHaveLength(0);
  });

  it("calls stackTrashLock when primitive is present", async () => {
    const self = makePerm();
    const source = makeSource(self);

    const card1 = inst("MACHINE-001");
    const card2 = inst("MACHINE-002");
    const oppDigimon = makePerm({ seat: 1 });

    const stackLocked: string[] = [];

    const ctx: EffectContext = {
      source,
      trigger: {},
      game: {
        player: (seat: number) => {
          if (seat === 0) return { hand: [card1, card2], trash: [], battleArea: [self] } as never;
          return { battleArea: [oppDigimon], hand: [], trash: [] } as never;
        },
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: (c: CardInstance) => {
          if (c.cardId === "MACHINE-001" || c.cardId === "MACHINE-002") return machineDef(c.cardId);
          if (c.cardId === cardId) return { kinds: ["Digimon"] } as never;
          return { kinds: ["Digimon"] } as never;
        },
      } as never,
      fx: {
        placeUnder: () => Promise.resolve([]),
        deDigivolve: () => [],
        stackTrashLock: (permanentId: string) => { stackLocked.push(permanentId); },
      } as never,
      ask: {
        selectCards: async (_ctx: unknown, opts: { candidates: string[] }) => opts.candidates.slice(0, 2),
        chooseTargets: async (_ctx: unknown, opts: { candidates: string[] }) => [opts.candidates[0]!],
      } as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, source);
    await effects[0]!.resolve(ctx);
    expect(stackLocked).toContain(self.permanentId);
  });
});
