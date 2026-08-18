import { describe, it, expect } from "vitest";
import { CardColor, CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent, Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import "./EX7-049.js";

// A3 for EX7-049 (Volcanicdramon, EX7 Black Lv.7):
//   [On Play] De-Digivolve 4 on 1 opponent Digimon (stops at level 3).
//   [When Attacking] Same De-Digivolve 4 effect.
//   [When Digivolving] ALL opponent battle-area Digimon with level <= 4 can't digivolve
//     until opponent's turn ends. Breeding area and level > 4 Digimon are excluded.
//   [All Turns] (Once Per Turn) — RESIDUAL: not implemented.

const cardId = "EX7-049";

let seq = 0;

function inst(cId: string, seat: Seat = 0): CardInstance {
  seq++;
  return { instanceId: `i${seq}`, cardId: cId, ownerSeat: seat, faceUp: true } as unknown as CardInstance;
}

function makePerm(opts: { cardId?: string; seat?: Seat; level?: number; inBreeding?: boolean } = {}): Permanent {
  seq++;
  return {
    permanentId: `p${seq}`,
    controllerSeat: opts.seat ?? 0,
    topCard: inst(opts.cardId ?? cardId, opts.seat ?? 0),
    stack: [],
    linked: [],
    baseDP: 15000,
    currentDP: 15000,
    isSuspended: false,
    inBreeding: opts.inBreeding ?? false,
  } as unknown as Permanent;
}

function digimonDef(id: string, level: number): CardDefinition {
  return {
    cardId: id,
    set: "EX7",
    nameEn: id,
    kinds: [CardKind.Digimon],
    colors: [CardColor.Black],
    playCost: 8,
    dp: 10000,
    level,
    types: ["Dragon"],
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

function makeSource(onField = true): CardSource {
  return {
    instanceId: "self-inst",
    cardId,
    ownerSeat: 0 as Seat,
    definition: undefined as never,
    permanent: () => makePerm(),
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

// ── module structure ─────────────────────────────────────────────────────────

describe("EX7-049 module structure", () => {
  it("is registered", () => {
    expect(requireMod().cardId).toBe(cardId);
  });

  it("returns 1 effect at OnPlay", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, makeSource());
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/on-play-dedigivolve`);
  });

  it("returns 1 effect at OnUseAttack", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.OnUseAttack, makeSource());
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/when-attacking-dedigivolve`);
  });

  it("returns 1 effect at WhenDigivolving", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.WhenDigivolving, makeSource());
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/when-digivolving-restrict-digivolve`);
  });

  it("returns no effects for unhandled timings", () => {
    expect(requireMod().effectsForTiming(EffectTiming.OnDestroyedAnyone, makeSource())).toHaveLength(0);
  });
});

// ── [On Play] de-digivolve ───────────────────────────────────────────────────

describe("EX7-049 [On Play] de-digivolve", () => {
  it("calls deDigivolve(target, 4, { stopAtLevel: 3 }) on opponent Digimon", async () => {
    const oppPerm = makePerm({ cardId: "OPP-DIGI", seat: 1, level: 6 });
    const deDigivolved: { permanentId: string; n: number; opts?: unknown }[] = [];

    const ctx: EffectContext = {
      source: makeSource(),
      trigger: {},
      game: {
        player: (s: Seat) => {
          if (s === 0) return { battleArea: [], hand: [], trash: [] } as never;
          return { battleArea: [oppPerm], hand: [], trash: [] } as never;
        },
        opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
        permanentById: () => undefined as never,
        definitionOf: () => digimonDef("OPP-DIGI", 6) as never,
      } as never,
      fx: {
        deDigivolve: (permanentId: string, n: number, opts?: unknown) => {
          deDigivolved.push({ permanentId, n, opts });
          return [];
        },
      } as never,
      ask: {
        chooseTargets: async (_c: unknown, o: { candidates: string[] }) => [o.candidates[0]!],
      } as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, makeSource());
    await effects[0]!.resolve(ctx);

    expect(deDigivolved).toHaveLength(1);
    expect(deDigivolved[0]!.permanentId).toBe(oppPerm.permanentId);
    expect(deDigivolved[0]!.n).toBe(4);
    expect(deDigivolved[0]!.opts).toEqual({ stopAtLevel: 3 });
  });

  it("does nothing when opponent has no Digimon", async () => {
    const deDigivolved: string[] = [];

    const ctx: EffectContext = {
      source: makeSource(),
      trigger: {},
      game: {
        player: (_s: Seat) => ({ battleArea: [], hand: [], trash: [] } as never),
        opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
        permanentById: () => undefined as never,
        definitionOf: () => undefined as never,
      } as never,
      fx: {
        deDigivolve: (id: string) => { deDigivolved.push(id); return []; },
      } as never,
      ask: {} as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, makeSource());
    await effects[0]!.resolve(ctx);
    expect(deDigivolved).toHaveLength(0);
  });
});

// ── [When Digivolving] restrict ───────────────────────────────────────────────

describe("EX7-049 [When Digivolving] restrict digivolve", () => {
  it("restricts opponent Lv.4 Digimon in battle area", async () => {
    const lv4Perm = makePerm({ cardId: "OPP-LV4", seat: 1 });
    const restricted: { permanentId: string; restriction: string; duration: unknown }[] = [];

    const ctx: EffectContext = {
      source: makeSource(),
      trigger: {},
      game: {
        player: (s: Seat) => {
          if (s === 0) return { battleArea: [] } as never;
          return { battleArea: [lv4Perm] } as never;
        },
        opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
        permanentById: () => undefined as never,
        definitionOf: () => digimonDef("OPP-LV4", 4) as never,
      } as never,
      fx: {
        restrict: (permanentId: string, restriction: string, duration: unknown) => {
          restricted.push({ permanentId, restriction, duration });
        },
      } as never,
      ask: {} as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.WhenDigivolving, makeSource());
    await effects[0]!.resolve(ctx);

    expect(restricted).toHaveLength(1);
    expect(restricted[0]!.permanentId).toBe(lv4Perm.permanentId);
    expect(restricted[0]!.restriction).toBe("digivolve");
    expect(restricted[0]!.duration).toBe(EffectDuration.UntilOpponentTurnEnd);
  });

  it("does NOT restrict opponent Lv.5 Digimon (level > 4)", async () => {
    const lv5Perm = makePerm({ cardId: "OPP-LV5", seat: 1 });
    const restricted: string[] = [];

    const ctx: EffectContext = {
      source: makeSource(),
      trigger: {},
      game: {
        player: (s: Seat) => {
          if (s === 0) return { battleArea: [] } as never;
          return { battleArea: [lv5Perm] } as never;
        },
        opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
        permanentById: () => undefined as never,
        definitionOf: () => digimonDef("OPP-LV5", 5) as never,
      } as never,
      fx: {
        restrict: (permanentId: string) => { restricted.push(permanentId); },
      } as never,
      ask: {} as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.WhenDigivolving, makeSource());
    await effects[0]!.resolve(ctx);
    expect(restricted).toHaveLength(0);
  });

  it("does NOT restrict Digimon in the breeding area (KB Q3853-Q3855)", async () => {
    const breedingPerm = makePerm({ cardId: "OPP-LV4-BREED", seat: 1, inBreeding: true });
    const restricted: string[] = [];

    const ctx: EffectContext = {
      source: makeSource(),
      trigger: {},
      game: {
        player: (s: Seat) => {
          if (s === 0) return { battleArea: [] } as never;
          return { battleArea: [breedingPerm] } as never;
        },
        opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
        permanentById: () => undefined as never,
        definitionOf: () => digimonDef("OPP-LV4-BREED", 4) as never,
      } as never,
      fx: {
        restrict: (permanentId: string) => { restricted.push(permanentId); },
      } as never,
      ask: {} as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.WhenDigivolving, makeSource());
    await effects[0]!.resolve(ctx);
    expect(restricted).toHaveLength(0);
  });

  it("restricts only Lv.<=4 Digimon when both low and high level are present", async () => {
    const lv3Perm = makePerm({ cardId: "OPP-LV3", seat: 1 });
    const lv4Perm = makePerm({ cardId: "OPP-LV4", seat: 1 });
    const lv6Perm = makePerm({ cardId: "OPP-LV6", seat: 1 });
    const restricted: string[] = [];

    const defMap = new Map<string, CardDefinition>([
      ["OPP-LV3", digimonDef("OPP-LV3", 3)],
      ["OPP-LV4", digimonDef("OPP-LV4", 4)],
      ["OPP-LV6", digimonDef("OPP-LV6", 6)],
    ]);

    const ctx: EffectContext = {
      source: makeSource(),
      trigger: {},
      game: {
        player: (s: Seat) => {
          if (s === 0) return { battleArea: [] } as never;
          return { battleArea: [lv3Perm, lv4Perm, lv6Perm] } as never;
        },
        opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
        permanentById: () => undefined as never,
        definitionOf: (c: CardInstance) => (defMap.get(c.cardId) ?? digimonDef(c.cardId, 5)) as never,
      } as never,
      fx: {
        restrict: (permanentId: string) => { restricted.push(permanentId); },
      } as never,
      ask: {} as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.WhenDigivolving, makeSource());
    await effects[0]!.resolve(ctx);

    expect(restricted).toContain(lv3Perm.permanentId);
    expect(restricted).toContain(lv4Perm.permanentId);
    expect(restricted).not.toContain(lv6Perm.permanentId);
    expect(restricted).toHaveLength(2);
  });
});
