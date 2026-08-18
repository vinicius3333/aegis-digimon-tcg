import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import "./EX11-073.js";

// A3 for EX11-073 (ExMaquinamon, EX11 Multi-Color Lv.7):
//   [Static] ＜Security Attack +1＞, ＜Blocker＞, ＜Link +2＞
//   [When Digivolving] if DNA: link up to 3 [Maquinamon] from hand/trash/stack
//   [End of Opponent's Turn][Once Per Turn]: for each link card, trash opp security + return opp Digimon to deck

const cardId = "EX11-073";

let seq = 0;

function inst(cId: string, seat = 0): CardInstance {
  seq++;
  return { instanceId: `i${seq}`, cardId: cId, ownerSeat: seat, faceUp: true } as unknown as CardInstance;
}

function makePerm(opts: {
  cardId?: string;
  seat?: number;
  linkedCount?: number;
  stackCardIds?: string[];
} = {}): Permanent {
  seq++;
  const linkedCards = Array.from({ length: opts.linkedCount ?? 0 }, () => inst("MAQUINA-001"));
  const stackCards = (opts.stackCardIds ?? []).map((cid) => inst(cid));
  return {
    permanentId: `p${seq}`,
    controllerSeat: opts.seat ?? 0,
    topCard: inst(opts.cardId ?? cardId, opts.seat ?? 0),
    stack: stackCards,
    linked: linkedCards,
    baseDP: 12000,
    currentDP: 12000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(perm: Permanent | undefined, onField = true, ownersTurn = false): CardSource {
  return {
    instanceId: "self",
    cardId,
    ownerSeat: 0,
    definition: undefined as never,
    permanent: () => perm,
    isOnBattleArea: () => onField,
    isOwnersTurn: () => ownersTurn, // end of OPPONENT's turn → ownersTurn = false
    hasColor: () => false,
  };
}

const requireMod = () => {
  const mod = getEffectModule(cardId);
  expect(mod, `${cardId} must be registered`).toBeDefined();
  return mod!;
};

// ── module registration ──────────────────────────────────────────────────────

describe("EX11-073 module structure", () => {
  it("registers as a hand-written module", () => {
    expect(requireMod().cardId).toBe(cardId);
  });

  it("returns 3 effects at EffectTiming.None (SecurityAttack, Blocker, LinkMax)", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.None, makeSource(makePerm()));
    expect(effects).toHaveLength(3);
    expect(effects[0]!.effectKey).toBe(`${cardId}/security-attack`);
    expect(effects[1]!.effectKey).toBe(`${cardId}/blocker`);
    expect(effects[2]!.effectKey).toBe(`${cardId}/link-max`);
  });

  it("returns 1 effect at WhenDigivolving", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.WhenDigivolving, makeSource(makePerm()));
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/when-digivolving-link-maquinamon`);
    expect(effects[0]!.optional).toBe(true);
  });

  it("returns 1 effect at OnEndTurn (maxPerTurn 1)", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.OnEndTurn, makeSource(makePerm()));
    expect(effects).toHaveLength(1);
    expect(effects[0]!.maxPerTurn).toBe(1);
  });
});

// ── Static grants ────────────────────────────────────────────────────────────

describe("EX11-073 static keyword grants", () => {
  it("grants SecurityAttack +1", async () => {
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
    await effects[0]!.resolve(ctx);
    expect(granted).toContainEqual({ keyword: "SecurityAttack", amount: 1 });
  });

  it("grants Blocker", async () => {
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
    expect(granted).toContain("Blocker");
  });

  it("grants LinkMax +2", async () => {
    const self = makePerm();
    const source = makeSource(self);
    const linkMaxGrants: { delta: number }[] = [];
    const ctx: EffectContext = {
      source,
      trigger: {},
      game: { player: () => ({ battleArea: [] } as never), opponentOf: (s: number) => (s === 0 ? 1 : 0), permanentById: () => undefined, definitionOf: () => undefined as never } as never,
      fx: { grantLinkMax: (_pId: string, delta: number) => { linkMaxGrants.push({ delta }); } } as never,
      ask: {} as never,
    };
    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    await effects[2]!.resolve(ctx);
    expect(linkMaxGrants).toContainEqual({ delta: 2 });
  });
});

// ── [When Digivolving] — DNA gate + link ────────────────────────────────────

describe("EX11-073 When Digivolving: DNA gate for Maquinamon link", () => {
  it("canActivate returns false when not DNA digivolving", () => {
    const self = makePerm();
    const source = makeSource(self);
    const effects = requireMod().effectsForTiming(EffectTiming.WhenDigivolving, source);
    const ctx: EffectContext = {
      source,
      trigger: { isDnaDigivolve: false },
      game: {} as never,
      fx: {} as never,
      ask: {} as never,
    };
    expect(effects[0]!.canActivate(ctx)).toBe(false);
  });

  it("canActivate returns true when isDnaDigivolve is true", () => {
    const self = makePerm();
    const source = makeSource(self);
    const effects = requireMod().effectsForTiming(EffectTiming.WhenDigivolving, source);
    const ctx: EffectContext = {
      source,
      trigger: { isDnaDigivolve: true },
      game: {} as never,
      fx: {} as never,
      ask: {} as never,
    };
    expect(effects[0]!.canActivate(ctx)).toBe(true);
  });

  it("links Maquinamon cards from hand when DNA digivolving", async () => {
    const self = makePerm();
    const source = makeSource(self);

    const maquinaCard = inst("EX11-001"); // any ID — we'll fake the definition
    const linked: { target: string; ids: string[] }[] = [];

    const ctx: EffectContext = {
      source,
      trigger: { isDnaDigivolve: true },
      game: {
        player: (seat: number) => {
          if (seat === 0) return { hand: [maquinaCard], trash: [], battleArea: [] } as never;
          return { hand: [], trash: [], battleArea: [] } as never;
        },
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: (c: CardInstance) => {
          if (c.cardId === "EX11-001") return { nameEn: "Maquinamon", kinds: ["Digimon"], types: [] } as never;
          return { nameEn: "Unknown", kinds: ["Digimon"], types: [] } as never;
        },
      } as never,
      fx: {
        link: (targetPermanentId: string, ids: string[]) => {
          linked.push({ target: targetPermanentId, ids });
          return Promise.resolve([]);
        },
      } as never,
      ask: {
        selectCards: async (_ctx: unknown, opts: { candidates: string[] }) => opts.candidates.slice(0, 1),
      } as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);

    expect(linked.length).toBeGreaterThan(0);
    expect(linked[0]!.target).toBe(self.permanentId);
  });

  it("does nothing when not DNA digivolving", async () => {
    const self = makePerm();
    const source = makeSource(self);
    const linked: string[] = [];

    const ctx: EffectContext = {
      source,
      trigger: { isDnaDigivolve: false },
      game: {
        player: () => ({ hand: [], trash: [], battleArea: [] } as never),
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: () => ({ nameEn: "X", kinds: ["Digimon"], types: [] } as never),
      } as never,
      fx: { link: (t: string, ids: string[]) => { linked.push(...ids); return Promise.resolve([]); } } as never,
      ask: { selectCards: async () => [] } as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.WhenDigivolving, source);
    await effects[0]!.resolve(ctx);
    expect(linked).toHaveLength(0);
  });
});

// ── [End of Opponent's Turn]: link-count payoff ────────────────────────────

describe("EX11-073 End of Opponent's Turn: trash security + return Digimon per link", () => {
  it("when gate fires only on opponent's turn (not owner's turn)", () => {
    // isOwnersTurn = false → !isOwnersTurn = true → fires
    const self = makePerm({ linkedCount: 1 });
    const sourceOppTurn = makeSource(self, true, false);
    const sourceOwnerTurn = makeSource(self, true, true);

    const effectsOppTurn = requireMod().effectsForTiming(EffectTiming.OnEndTurn, sourceOppTurn);
    const effectsOwnerTurn = requireMod().effectsForTiming(EffectTiming.OnEndTurn, sourceOwnerTurn);

    // canTrigger checks isOnBattleArea && !isOwnersTurn
    const fakeCtxOpp: EffectContext = {
      source: sourceOppTurn,
      trigger: {},
      game: {} as never,
      fx: {} as never,
      ask: {} as never,
    };
    const fakeCtxOwner: EffectContext = {
      source: sourceOwnerTurn,
      trigger: {},
      game: {} as never,
      fx: {} as never,
      ask: {} as never,
    };
    expect(effectsOppTurn[0]!.canTrigger(fakeCtxOpp)).toBe(true);
    expect(effectsOwnerTurn[0]!.canTrigger(fakeCtxOwner)).toBe(false);
  });

  it("trashes N security and returns N opponent Digimon when N=2 links", async () => {
    const self = makePerm({ linkedCount: 2 });
    const source = makeSource(self, true, false);

    const oppDigimon1 = makePerm({ seat: 1, cardId: "BT1-010" });
    const oppDigimon2 = makePerm({ seat: 1, cardId: "BT1-011" });

    const trashedSecurity: { seat: number; n: number }[] = [];
    const returnedToDeck: { ids: string[]; toTop?: boolean }[] = [];

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
          if (pid === oppDigimon1.permanentId) return oppDigimon1;
          if (pid === oppDigimon2.permanentId) return oppDigimon2;
          return undefined;
        },
        definitionOf: () => ({ kinds: ["Digimon"] } as never),
      } as never,
      fx: {
        trashFromSecurity: (seat: number, n: number) => { trashedSecurity.push({ seat, n }); return Promise.resolve([]); },
        returnToDeck: (ids: string[], opts?: { toTop?: boolean }) => { returnedToDeck.push({ ids, toTop: opts?.toTop }); return Promise.resolve([]); },
      } as never,
      ask: {
        chooseTargets: async (_ctx: unknown, opts: { candidates: string[] }) =>
          opts.candidates.slice(0, opts.candidates.length),
      } as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.OnEndTurn, source);
    await effects[0]!.resolve(ctx);

    // Should trash 2 security from opponent.
    expect(trashedSecurity).toContainEqual({ seat: 1, n: 2 });
    // Should return Digimon to deck (toTop: false).
    expect(returnedToDeck.length).toBeGreaterThan(0);
    expect(returnedToDeck[0]!.toTop).toBe(false);
  });

  it("does nothing when no link cards", async () => {
    const self = makePerm({ linkedCount: 0 });
    const source = makeSource(self, true, false);

    const trashedSecurity: unknown[] = [];

    const ctx: EffectContext = {
      source,
      trigger: {},
      game: {
        player: () => ({ battleArea: [] } as never),
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: () => ({ kinds: ["Digimon"] } as never),
      } as never,
      fx: {
        trashFromSecurity: (_seat: number, n: number) => { trashedSecurity.push(n); return Promise.resolve([]); },
      } as never,
      ask: {} as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.OnEndTurn, source);
    await effects[0]!.resolve(ctx);
    expect(trashedSecurity).toHaveLength(0);
  });
});
