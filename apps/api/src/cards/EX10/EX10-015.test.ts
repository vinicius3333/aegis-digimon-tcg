import { describe, it, expect } from "vitest";
import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { definitionOf } from "../../engine/cards/cardData.js";
import "./EX10-015.js";

// A3 for EX10-015 (Psychemon, EX10 Green/Purple Lv.3):
//   ＜Save＞ [On Deletion]: place this card under one of your Tamers.
//   [Start of Your Main Phase]: by trashing 1 ＜Save＞-text card from hand, draw 1 and suspend
//     1 of your opponent's Digimon.
//   [ESS] ＜Piercing＞ (inherited).
//   Also: can digivolve onto Lv.2 with ＜Save＞ text at cost 0
//     (via ALTERNATE_DIGIVOLUTION_OVERRIDES["EX10-015"] in packages/shared/src/effects/data.ts).
//
// FAILS-WHEN-REVERTED: without the hand-written module, the HAND-FIXED IR stub only partially
// covers these effects (marked coverage:"none"); the Save PlaceUnder, the grantPierce, and the
// main-phase trash+draw+suspend are not exercised.

const cardId = "EX10-015";

// A card with ＜Save＞ in its effectText: BT21-063 (Gumdramon, whose effectText includes ＜Save＞).
const SAVE_CARD_ID = "BT21-063";

let seq = 0;

function inst(cId: string, owner = 0): CardInstance {
  seq++;
  return {
    instanceId: `i${seq}`,
    cardId: cId,
    ownerSeat: owner,
    faceUp: true,
  } as unknown as CardInstance;
}

function makePerm(opts: { inBreeding?: boolean; suspended?: boolean; cardId?: string } = {}): Permanent {
  seq++;
  return {
    permanentId: `p-${seq}`,
    controllerSeat: 0,
    topCard: inst(opts.cardId ?? cardId),
    stack: [],
    linked: [],
    baseDP: 3000,
    currentDP: 3000,
    isSuspended: opts.suspended ?? false,
    inBreeding: opts.inBreeding ?? false,
  } as unknown as Permanent;
}

function makeTamer(owner = 0): Permanent {
  seq++;
  return {
    permanentId: `t-${seq}`,
    controllerSeat: owner,
    topCard: inst("AD1-019", owner), // AD1-019 is a Tamer
    stack: [],
    linked: [],
    baseDP: 0,
    currentDP: 0,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(perm: Permanent | undefined, onField = true, ownersTurn = true): CardSource {
  return {
    instanceId: `self-${seq}`,
    cardId,
    ownerSeat: 0,
    definition: definitionOf(cardId),
    permanent: () => perm,
    isOnBattleArea: () => onField,
    isOwnersTurn: () => ownersTurn,
    hasColor: () => false,
  };
}

const requireMod = () => {
  const mod = getEffectModule(cardId);
  expect(mod, "EX10-015 must be registered").toBeDefined();
  return mod!;
};

// ── module structure ──────────────────────────────────────────────────────────

describe("EX10-015 module structure", () => {
  it("registers a hand-written module (not the inert HAND-FIXED IR stub)", () => {
    expect(requireMod().cardId).toBe(cardId);
  });

  it("contributes 1 effect at OnDestroyedAnyone (Save)", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.OnDestroyedAnyone, makeSource(makePerm()));
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/save-place-under`);
    expect(effects[0]!.optional).toBe(true);
  });

  it("contributes 1 effect at OnStartMainPhase", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.OnStartMainPhase, makeSource(makePerm()));
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/start-main-draw-suspend`);
  });

  it("contributes 1 effect at None (ESS Piercing)", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.None, makeSource(makePerm()));
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/ess-piercing`);
    expect(effects[0]!.isInherited).toBe(true);
  });

  it("contributes 0 effects at OnPlay", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, makeSource(makePerm()));
    expect(effects).toHaveLength(0);
  });
});

// ── ＜Save＞ — on deletion place under Tamer ──────────────────────────────────

describe("EX10-015 ＜Save＞ [On Deletion]", () => {
  it("places this card under the controller's Tamer on deletion", async () => {
    const selfInst = inst(cardId);
    const perm = makePerm();
    const source: CardSource = {
      ...makeSource(perm),
      instanceId: selfInst.instanceId,
    };
    const tamer = makeTamer();
    const placeUnderCalls: { targetId: string; ids: string[] }[] = [];

    const ctx = {
      source,
      trigger: { deletedInstanceIds: [selfInst.instanceId] },
      game: {
        player: (seat: number) => ({
          seat,
          hand: [],
          trash: [selfInst],
          deck: [],
          battleArea: [tamer],
        }),
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        definitionOf: (c: CardInstance) => definitionOf(c.cardId),
      },
      fx: {
        placeUnder: async (targetId: string, ids: string[], _opts?: unknown) => {
          placeUnderCalls.push({ targetId, ids });
          return [];
        },
      },
      ask: {
        optional: async () => true,
        selectCards: async () => [],
        chooseTargets: async (_ctx: unknown, o: { candidates: string[] }) => [o.candidates[0]!],
        chooseOption: async () => 0,
      },
    } as unknown as EffectContext;

    const eff = requireMod().effectsForTiming(EffectTiming.OnDestroyedAnyone, source)[0]!;
    await eff.resolve(ctx);

    expect(placeUnderCalls).toHaveLength(1);
    expect(placeUnderCalls[0]!.targetId).toBe(tamer.permanentId);
    expect(placeUnderCalls[0]!.ids).toContain(selfInst.instanceId);
  });

  it("does NOT place under Tamer when there are no Tamers on the field", async () => {
    const selfInst = inst(cardId);
    const perm = makePerm();
    const source: CardSource = {
      ...makeSource(perm),
      instanceId: selfInst.instanceId,
    };
    const placeUnderCalls: unknown[] = [];

    const ctx = {
      source,
      trigger: { deletedInstanceIds: [selfInst.instanceId] },
      game: {
        player: (seat: number) => ({
          seat,
          hand: [],
          trash: [selfInst],
          deck: [],
          battleArea: [], // no Tamers
        }),
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        definitionOf: (c: CardInstance) => definitionOf(c.cardId),
      },
      fx: {
        placeUnder: async (targetId: string, ids: string[]) => {
          placeUnderCalls.push({ targetId, ids });
          return [];
        },
      },
      ask: {
        optional: async () => true,
        selectCards: async () => [],
        chooseTargets: async () => [],
        chooseOption: async () => 0,
      },
    } as unknown as EffectContext;

    const eff = requireMod().effectsForTiming(EffectTiming.OnDestroyedAnyone, source)[0]!;
    await eff.resolve(ctx);
    expect(placeUnderCalls).toHaveLength(0);
  });
});

// ── [Start of Your Main Phase] ───────────────────────────────────────────────

describe("EX10-015 [Start of Your Main Phase]", () => {
  it("canActivate is false when no ＜Save＞-text card is in hand", () => {
    const source = makeSource(makePerm(), true, true);
    const eff = requireMod().effectsForTiming(EffectTiming.OnStartMainPhase, source)[0]!;
    const ctx = {
      source,
      trigger: {},
      game: {
        player: (seat: number) => ({
          seat,
          hand: [inst("BT1-010")], // no Save in its text
          battleArea: [],
        }),
        definitionOf: (c: CardInstance) => definitionOf(c.cardId),
      },
      fx: {},
      ask: {},
    } as unknown as EffectContext;
    expect(eff.canActivate(ctx)).toBe(false);
  });

  it("canActivate is true when a ＜Save＞-text card is in hand", () => {
    const source = makeSource(makePerm(), true, true);
    const eff = requireMod().effectsForTiming(EffectTiming.OnStartMainPhase, source)[0]!;
    const ctx = {
      source,
      trigger: {},
      game: {
        player: (seat: number) => ({
          seat,
          hand: [inst(SAVE_CARD_ID)], // BT21-063 has ＜Save＞ in effectText
          battleArea: [],
        }),
        definitionOf: (c: CardInstance) => definitionOf(c.cardId),
      },
      fx: {},
      ask: {},
    } as unknown as EffectContext;
    expect(eff.canActivate(ctx)).toBe(true);
  });

  it("SAVE_CARD_ID card has ＜Save＞ in its effectText (test integrity check)", () => {
    const def = definitionOf(SAVE_CARD_ID);
    const hay = `${def.effectText ?? ""} ${def.inheritedEffectText ?? ""}`;
    expect(hay.includes("＜Save＞") || hay.toLowerCase().includes("<save")).toBe(true);
  });

  it("trashes 1 Save card, draws 1, and suspends 1 opponent Digimon", async () => {
    const source = makeSource(makePerm(), true, true);
    const eff = requireMod().effectsForTiming(EffectTiming.OnStartMainPhase, source)[0]!;

    const saveCard = inst(SAVE_CARD_ID);
    const oppDigimon = makePerm({ cardId: "BT1-009" });
    oppDigimon.controllerSeat = 1;
    oppDigimon.topCard = inst("BT1-009", 1);

    const trashCalls: string[][] = [];
    const drawCalls: Array<{ seat: number; amount: number }> = [];
    const suspendCalls: string[][] = [];

    const ctx = {
      source,
      trigger: {},
      game: {
        player: (seat: number) => ({
          seat,
          hand: seat === 0 ? [saveCard] : [],
          battleArea: seat === 1 ? [oppDigimon] : [],
        }),
        opponentOf: (s: number) => (s === 0 ? 1 : 0),
        definitionOf: (c: CardInstance) => definitionOf(c.cardId),
      },
      fx: {
        trash: async (ids: string[]) => {
          trashCalls.push(ids);
          return [];
        },
        draw: (seat: number, amount: number) => {
          drawCalls.push({ seat, amount });
        },
        suspend: async (ids: string[]) => {
          suspendCalls.push(ids);
          return ids;
        },
      },
      ask: {
        optional: async () => true,
        selectCards: async (_ctx: unknown, o: { candidates: string[] }) => [o.candidates[0]!],
        chooseTargets: async (_ctx: unknown, o: { candidates: string[] }) => [o.candidates[0]!],
        chooseOption: async () => 0,
      },
    } as unknown as EffectContext;

    await eff.resolve(ctx);

    expect(trashCalls).toHaveLength(1);
    expect(trashCalls[0]).toContain(saveCard.instanceId);
    expect(drawCalls).toHaveLength(1);
    expect(drawCalls[0]).toEqual({ seat: 0, amount: 1 });
    expect(suspendCalls).toHaveLength(1);
    expect(suspendCalls[0]).toContain(oppDigimon.permanentId);
  });
});

// ── ESS ＜Piercing＞ (inherited) ──────────────────────────────────────────────

describe("EX10-015 ESS ＜Piercing＞", () => {
  it("grants ＜Piercing＞ to the hosting permanent during static resolve", async () => {
    const perm = makePerm();
    const source = makeSource(perm, true);
    const eff = requireMod().effectsForTiming(EffectTiming.None, source)[0]!;

    const pierceCalls: Array<{ permanentId: string; duration: EffectDuration }> = [];
    const ctx = {
      source,
      trigger: {},
      game: {
        player: () => ({ seat: 0, hand: [], battleArea: [] }),
        definitionOf: (c: CardInstance) => definitionOf(c.cardId),
      },
      fx: {
        grantPierce: (permanentId: string, duration: EffectDuration) => {
          pierceCalls.push({ permanentId, duration });
        },
      },
      ask: { optional: async () => false, selectCards: async () => [] },
    } as unknown as EffectContext;

    await eff.resolve(ctx);

    expect(pierceCalls).toHaveLength(1);
    expect(pierceCalls[0]!.permanentId).toBe(perm.permanentId);
    expect(pierceCalls[0]!.duration).toBe(EffectDuration.Permanent);
  });
});
