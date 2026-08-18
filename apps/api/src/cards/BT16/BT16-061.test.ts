import { describe, it, expect } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import "./BT16-061.js";

// A3 for BT16-061 (DoruGreymon, BT16 Black Lv.5):
//   [Static] ＜Collision＞
//   [All Turns] whenAttackTargetSwitched: if has [SoC] Tamer in stack, digivolve into
//     Beast Dragon/Undead/SoC Digimon from hand for free.
//   [All Turns][Inherited][Once Per Turn] OnBattleDeleteOpponent:
//     play 1 card with [X Antibody] or [SoC] trait, cost ≤ 5, from trash for free.

const cardId = "BT16-061";

let seq = 0;

function inst(cId: string, seat = 0): CardInstance {
  seq++;
  return {
    instanceId: `i${seq}`,
    cardId: cId,
    ownerSeat: seat,
    faceUp: true,
  } as unknown as CardInstance;
}

function makePerm(opts: { cardId?: string; seat?: number; stack?: CardInstance[] } = {}): Permanent {
  seq++;
  return {
    permanentId: `p${seq}`,
    controllerSeat: opts.seat ?? 0,
    topCard: inst(opts.cardId ?? cardId, opts.seat ?? 0),
    stack: opts.stack ?? [],
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

describe("BT16-061 module structure", () => {
  it("registers as a hand-written module", () => {
    expect(requireMod().cardId).toBe(cardId);
  });

  it("returns 2 effects at EffectTiming.None (Collision + whenAttackTargetSwitched install)", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.None, makeSource(makePerm()));
    expect(effects).toHaveLength(2);
    expect(effects[0]!.effectKey).toBe(`${cardId}/collision`);
    expect(effects[1]!.effectKey).toBe(`${cardId}/when-attack-target-switched-install`);
  });

  it("returns 1 effect at OnBattleDeleteOpponent", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.OnBattleDeleteOpponent, makeSource(makePerm()));
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/deletes-digimon-play-from-trash`);
  });

  it("deletes-digimon effect is marked isInherited and maxPerTurn 1", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.OnBattleDeleteOpponent, makeSource(makePerm()));
    expect(effects[0]!.isInherited).toBe(true);
    expect(effects[0]!.maxPerTurn).toBe(1);
  });

  it("returns 0 effects for other timings", () => {
    const timings = [EffectTiming.OnPlay, EffectTiming.WhenDigivolving, EffectTiming.OnEndBattle];
    for (const t of timings) {
      expect(requireMod().effectsForTiming(t, makeSource(makePerm()))).toHaveLength(0);
    }
  });
});

// ── Static: ＜Collision＞ ──────────────────────────────────────────────────────

describe("BT16-061 static Collision grant", () => {
  it("grants Collision keyword to self permanent", async () => {
    const self = makePerm();
    const source = makeSource(self);
    const granted: string[] = [];

    const ctx: EffectContext = {
      source,
      trigger: {},
      game: {
        player: () => ({ battleArea: [self] } as never),
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: () => undefined as never,
      } as never,
      fx: {
        grantKeyword: (_pId: string, keyword: string) => { granted.push(keyword); },
      } as never,
      ask: {} as never,
    };

    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    await effects[0]!.resolve(ctx);
    expect(granted).toContain("Collision");
  });

  it("does not grant Collision when off-field (no permanent)", async () => {
    const source = makeSource(undefined, false);
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
    expect(granted).toHaveLength(0);
  });
});

// ── whenAttackTargetSwitched watcher install ──────────────────────────────────

describe("BT16-061 whenAttackTargetSwitched watcher install", () => {
  it("installs a whenAttackTargetSwitched sub-trigger watcher on resolve", async () => {
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
    await effects[1]!.resolve(ctx);
    expect(installedEvents).toContain("whenAttackTargetSwitched");
  });

  it("skips digivolve when this Digimon has no [SoC] Tamer in its digivolution stack", async () => {
    const socTamerInStack = inst("BT-TAMER-NOSOC", 0);
    const self = makePerm({ stack: [socTamerInStack] });
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
    await effects[1]!.resolve(installCtx);

    const digivolved: string[] = [];
    const subCtx: EffectContext = {
      source: { ...source, isOnBattleArea: () => true, permanent: () => self },
      trigger: { attackerPermanentId: self.permanentId },
      game: {
        player: () => ({ hand: [], battleArea: [self] } as never),
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: (c: CardInstance) => {
          // The stack card is a Tamer but NOT [SoC] trait
          if (c.instanceId === socTamerInStack.instanceId) {
            return { kinds: ["Tamer"], types: ["Royal Knights"] } as never;
          }
          return { kinds: ["Digimon"], types: ["Beast Dragon"] } as never;
        },
      } as never,
      fx: {
        digivolveFromInstance: (_permId: string, instanceId: string) => {
          digivolved.push(instanceId);
          return Promise.resolve(undefined);
        },
      } as never,
      ask: {} as never,
    };

    await capturedRun!(subCtx);
    expect(digivolved).toHaveLength(0);
  });
});

// ── [All Turns][Inherited][Once Per Turn] OnBattleDeleteOpponent ──────────────

describe("BT16-061 OnBattleDeleteOpponent: play from trash", () => {
  it("canTrigger is true when this Digimon is the attacker", () => {
    const self = makePerm();
    const source = makeSource(self);
    const effects = requireMod().effectsForTiming(EffectTiming.OnBattleDeleteOpponent, source);
    const ctx: EffectContext = {
      source,
      trigger: { attackerPermanentId: self.permanentId, deletedPermanentId: "opp1" },
      game: { player: () => ({ trash: [] } as never), opponentOf: (s: number) => (s === 0 ? 1 : 0), permanentById: () => undefined, definitionOf: () => undefined as never } as never,
      fx: {} as never,
      ask: {} as never,
    };
    expect(effects[0]!.canTrigger(ctx)).toBe(true);
  });

  it("canTrigger is false when this Digimon is NOT the attacker", () => {
    const self = makePerm();
    const source = makeSource(self);
    const effects = requireMod().effectsForTiming(EffectTiming.OnBattleDeleteOpponent, source);
    const ctx: EffectContext = {
      source,
      trigger: { attackerPermanentId: "other-perm", deletedPermanentId: "opp1" },
      game: { player: () => ({ trash: [] } as never), opponentOf: (s: number) => (s === 0 ? 1 : 0), permanentById: () => undefined, definitionOf: () => undefined as never } as never,
      fx: {} as never,
      ask: {} as never,
    };
    expect(effects[0]!.canTrigger(ctx)).toBe(false);
  });

  it("canTrigger is false when off-field (no permanent)", () => {
    const source = makeSource(undefined, false);
    const effects = requireMod().effectsForTiming(EffectTiming.OnBattleDeleteOpponent, source);
    const ctx: EffectContext = {
      source,
      trigger: { attackerPermanentId: "any" },
      game: { player: () => ({ trash: [] } as never), opponentOf: (s: number) => (s === 0 ? 1 : 0), permanentById: () => undefined, definitionOf: () => undefined as never } as never,
      fx: {} as never,
      ask: {} as never,
    };
    expect(effects[0]!.canTrigger(ctx)).toBe(false);
  });

  it("canActivate is true when trash has a card with X Antibody trait, cost ≤ 5", () => {
    const self = makePerm();
    const source = makeSource(self);
    const trashCard = inst("BT1-010", 0);
    const effects = requireMod().effectsForTiming(EffectTiming.OnBattleDeleteOpponent, source);
    const ctx: EffectContext = {
      source,
      trigger: { attackerPermanentId: self.permanentId },
      game: {
        player: () => ({ trash: [trashCard] } as never),
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: (c: CardInstance) => {
          if (c.instanceId === trashCard.instanceId) {
            return { kinds: ["Digimon"], types: ["X Antibody"], playCost: 4 } as never;
          }
          return { kinds: ["Digimon"], types: [], playCost: 0 } as never;
        },
      } as never,
      fx: {} as never,
      ask: {} as never,
    };
    expect(effects[0]!.canActivate(ctx)).toBe(true);
  });

  it("canActivate is true when trash has a card with SoC trait, cost ≤ 5", () => {
    const self = makePerm();
    const source = makeSource(self);
    const trashCard = inst("BT16-010", 0);
    const effects = requireMod().effectsForTiming(EffectTiming.OnBattleDeleteOpponent, source);
    const ctx: EffectContext = {
      source,
      trigger: { attackerPermanentId: self.permanentId },
      game: {
        player: () => ({ trash: [trashCard] } as never),
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: (c: CardInstance) => {
          if (c.instanceId === trashCard.instanceId) {
            return { kinds: ["Digimon"], types: ["SoC"], playCost: 5 } as never;
          }
          return { kinds: ["Digimon"], types: [], playCost: 0 } as never;
        },
      } as never,
      fx: {} as never,
      ask: {} as never,
    };
    expect(effects[0]!.canActivate(ctx)).toBe(true);
  });

  it("canActivate is false when trash has no eligible cards", () => {
    const self = makePerm();
    const source = makeSource(self);
    const effects = requireMod().effectsForTiming(EffectTiming.OnBattleDeleteOpponent, source);
    const ctx: EffectContext = {
      source,
      trigger: { attackerPermanentId: self.permanentId },
      game: {
        player: () => ({ trash: [] } as never),
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: () => ({ kinds: ["Digimon"], types: [], playCost: 0 } as never),
      } as never,
      fx: {} as never,
      ask: {} as never,
    };
    expect(effects[0]!.canActivate(ctx)).toBe(false);
  });

  it("canActivate is false when trash card cost > 5", () => {
    const self = makePerm();
    const source = makeSource(self);
    const trashCard = inst("BT1-010", 0);
    const effects = requireMod().effectsForTiming(EffectTiming.OnBattleDeleteOpponent, source);
    const ctx: EffectContext = {
      source,
      trigger: { attackerPermanentId: self.permanentId },
      game: {
        player: () => ({ trash: [trashCard] } as never),
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: (c: CardInstance) => {
          if (c.instanceId === trashCard.instanceId) {
            return { kinds: ["Digimon"], types: ["X Antibody"], playCost: 6 } as never;
          }
          return { kinds: ["Digimon"], types: [], playCost: 0 } as never;
        },
      } as never,
      fx: {} as never,
      ask: {} as never,
    };
    expect(effects[0]!.canActivate(ctx)).toBe(false);
  });

  it("resolve plays the chosen [X Antibody] card from trash for free", async () => {
    const self = makePerm();
    const source = makeSource(self);
    const trashCard = inst("BT-XANTIBODY", 0);
    const played: string[][] = [];

    const effects = requireMod().effectsForTiming(EffectTiming.OnBattleDeleteOpponent, source);

    const ctx: EffectContext = {
      source,
      trigger: { attackerPermanentId: self.permanentId, deletedPermanentId: "opp-perm" },
      game: {
        player: (seat: number) => {
          if (seat === 0) return { trash: [trashCard], battleArea: [self] } as never;
          return { trash: [], battleArea: [] } as never;
        },
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: (c: CardInstance) => {
          if (c.instanceId === trashCard.instanceId) {
            return { kinds: ["Digimon"], types: ["X Antibody"], playCost: 4 } as never;
          }
          return { kinds: ["Digimon"], types: [], playCost: 0 } as never;
        },
      } as never,
      fx: {
        playInstances: (instanceIds: string[], opts: { payCost: boolean }) => {
          played.push(instanceIds);
          expect(opts.payCost).toBe(false);
          return Promise.resolve([]);
        },
      } as never,
      ask: {
        selectCards: async (_ctx: unknown, opts: { candidates: string[]; min: number; max: number }) =>
          opts.candidates.slice(0, 1),
      } as never,
    };

    await effects[0]!.resolve(ctx);

    expect(played).toHaveLength(1);
    expect(played[0]).toContain(trashCard.instanceId);
  });

  it("resolve plays the chosen [SoC] card from trash for free", async () => {
    const self = makePerm();
    const source = makeSource(self);
    const trashCard = inst("BT-SOC-CARD", 0);
    const played: string[][] = [];

    const effects = requireMod().effectsForTiming(EffectTiming.OnBattleDeleteOpponent, source);

    const ctx: EffectContext = {
      source,
      trigger: { attackerPermanentId: self.permanentId, deletedPermanentId: "opp-perm" },
      game: {
        player: (seat: number) => {
          if (seat === 0) return { trash: [trashCard], battleArea: [self] } as never;
          return { trash: [], battleArea: [] } as never;
        },
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: (c: CardInstance) => {
          if (c.instanceId === trashCard.instanceId) {
            return { kinds: ["Digimon"], types: ["SoC"], playCost: 3 } as never;
          }
          return { kinds: ["Digimon"], types: [], playCost: 0 } as never;
        },
      } as never,
      fx: {
        playInstances: (instanceIds: string[], opts: { payCost: boolean }) => {
          played.push(instanceIds);
          expect(opts.payCost).toBe(false);
          return Promise.resolve([]);
        },
      } as never,
      ask: {
        selectCards: async (_ctx: unknown, opts: { candidates: string[]; min: number; max: number }) =>
          opts.candidates.slice(0, 1),
      } as never,
    };

    await effects[0]!.resolve(ctx);

    expect(played).toHaveLength(1);
    expect(played[0]).toContain(trashCard.instanceId);
  });

  it("resolve does nothing when no eligible cards are in trash", async () => {
    const self = makePerm();
    const source = makeSource(self);
    const played: string[][] = [];

    const effects = requireMod().effectsForTiming(EffectTiming.OnBattleDeleteOpponent, source);

    const ctx: EffectContext = {
      source,
      trigger: { attackerPermanentId: self.permanentId, deletedPermanentId: "opp-perm" },
      game: {
        player: (seat: number) => {
          if (seat === 0) return { trash: [], battleArea: [self] } as never;
          return { trash: [], battleArea: [] } as never;
        },
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: () => ({ kinds: ["Digimon"], types: [], playCost: 0 } as never),
      } as never,
      fx: {
        playInstances: (instanceIds: string[]) => {
          played.push(instanceIds);
          return Promise.resolve([]);
        },
      } as never,
      ask: {
        selectCards: async (_ctx: unknown, opts: { candidates: string[] }) => opts.candidates.slice(0, 1),
      } as never,
    };

    await effects[0]!.resolve(ctx);
    expect(played).toHaveLength(0);
  });

  it("resolve does nothing when player declines (selects 0 cards)", async () => {
    const self = makePerm();
    const source = makeSource(self);
    const trashCard = inst("BT-XANTIBODY", 0);
    const played: string[][] = [];

    const effects = requireMod().effectsForTiming(EffectTiming.OnBattleDeleteOpponent, source);

    const ctx: EffectContext = {
      source,
      trigger: { attackerPermanentId: self.permanentId, deletedPermanentId: "opp-perm" },
      game: {
        player: (seat: number) => {
          if (seat === 0) return { trash: [trashCard], battleArea: [self] } as never;
          return { trash: [], battleArea: [] } as never;
        },
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        permanentById: () => undefined,
        definitionOf: (c: CardInstance) => {
          if (c.instanceId === trashCard.instanceId) {
            return { kinds: ["Digimon"], types: ["X Antibody"], playCost: 4 } as never;
          }
          return { kinds: ["Digimon"], types: [], playCost: 0 } as never;
        },
      } as never,
      fx: {
        playInstances: (instanceIds: string[]) => {
          played.push(instanceIds);
          return Promise.resolve([]);
        },
      } as never,
      ask: {
        // Player declines the optional effect.
        selectCards: async (_ctx: unknown, _opts: unknown) => [],
      } as never,
    };

    await effects[0]!.resolve(ctx);
    expect(played).toHaveLength(0);
  });
});
