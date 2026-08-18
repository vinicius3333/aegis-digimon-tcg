import { describe, it, expect } from "vitest";
import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { definitionOf } from "../../engine/cards/cardData.js";
import "./BT14-006.js";

// A3 for BT14-006 (Bowmon, Purple Lv.2 DigiEgg):
//   [ESS][Your Turn] When a Digimon card with the [Dark Animal] or [SoC] trait is
//   trashed from your hand, this Digimon may digivolve into that card.
//
// KB rulings (binding, confirmed in prior research):
//   Q2370: Breeding-area Digimon cannot host this effect.
//   Q2371: Digivolution requirements must be met (not ignored).
//   Q2372: Digivolution cost must be paid (not free).
//
// FAILS-WHEN-REVERTED: without the hand-written module the card uses the inert
// RawUnparsed IR stub. The whenHandTrashed watcher is never installed, so
// digivolveFromInstance is never called.

const cardId = "BT14-006";

// A Dark Animal Digimon (BT14-071 has types: ["Dark Animal","X Antibody","SoC"]).
const DARK_ANIMAL_ID = "BT14-071";

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

function makePerm(opts: { inBreeding?: boolean } = {}): Permanent {
  seq++;
  return {
    permanentId: `p-${seq}`,
    controllerSeat: 0,
    topCard: inst(cardId),
    stack: [],
    linked: [],
    baseDP: 1000,
    currentDP: 1000,
    isSuspended: false,
    inBreeding: opts.inBreeding ?? false,
  } as unknown as Permanent;
}

function makeSource(perm: Permanent | undefined, onField = true): CardSource {
  return {
    instanceId: "self",
    cardId,
    ownerSeat: 0,
    definition: definitionOf(cardId),
    permanent: () => perm,
    isOnBattleArea: () => onField,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

interface CtxResult {
  ctx: EffectContext;
  digivolveCalls: Array<{ permanentId: string; instanceId: string; payCost: boolean }>;
  optionalAnswer: boolean;
  selectAnswer: string[];
}

function makeCtx(args: {
  source: CardSource;
  trash?: CardInstance[];
  optionalAnswer?: boolean;
  selectAnswer?: string[];
}): CtxResult {
  const digivolveCalls: Array<{ permanentId: string; instanceId: string; payCost: boolean }> = [];
  const optionalAnswer = args.optionalAnswer ?? true;
  const selectAnswer = args.selectAnswer ?? [];

  const player = {
    seat: 0,
    hand: [],
    trash: args.trash ?? [],
    deck: [],
  } as never;

  const ctx = {
    source: args.source,
    trigger: { handTrashedSeat: 0 },
    game: {
      player: () => player,
      opponentOf: (s: number) => (s === 0 ? 1 : 0),
      permanentById: () => undefined,
      definitionOf: (c: CardInstance) => definitionOf(c.cardId),
    },
    fx: {
      subscribeSubTrigger: (_sub: unknown) => 0,
      digivolveFromInstance: async (permanentId: string, instanceId: string, opts?: { payCost?: boolean }) => {
        digivolveCalls.push({ permanentId, instanceId, payCost: opts?.payCost ?? false });
      },
    },
    ask: {
      optional: async () => optionalAnswer,
      selectCards: async (_ctx: EffectContext, o: { candidates: string[]; min: number; max: number }) => {
        if (selectAnswer.length > 0) return selectAnswer;
        return o.candidates.slice(0, o.max);
      },
      chooseTargets: async () => [],
      chooseOption: async () => 0,
    },
  } as unknown as EffectContext;

  return { ctx, digivolveCalls, optionalAnswer, selectAnswer };
}

const requireMod = () => {
  const mod = getEffectModule(cardId);
  expect(mod, "BT14-006 must be registered").toBeDefined();
  return mod!;
};

describe("BT14-006 Bowmon [ESS][Your Turn] whenHandTrashed", () => {
  it("registers a hand-written module (not the inert IR stub)", () => {
    expect(requireMod().cardId).toBe(cardId);
  });

  it("produces 0 effects at OnPlay (no on-play text)", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.OnPlay, makeSource(makePerm()));
    expect(effects).toHaveLength(0);
  });

  it("produces exactly 1 static effect at EffectTiming.None (ESS watcher)", () => {
    const effects = requireMod().effectsForTiming(EffectTiming.None, makeSource(makePerm()));
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe(`${cardId}/ess-when-hand-trashed-digivolve`);
    expect(effects[0]!.isInherited).toBe(true);
  });

  it("installs a whenHandTrashed subscribeSubTrigger during static resolve", async () => {
    const perm = makePerm();
    const source = makeSource(perm);
    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    const eff = effects[0]!;

    let installed = false;
    const ctx = {
      source,
      trigger: {},
      game: {
        player: () => ({ seat: 0, hand: [], trash: [], deck: [] }),
        definitionOf: (c: CardInstance) => definitionOf(c.cardId),
      },
      fx: {
        subscribeSubTrigger: (sub: { event: string }) => {
          expect(sub.event).toBe("whenHandTrashed");
          installed = true;
          return 0;
        },
      },
      ask: {
        optional: async () => false,
        selectCards: async () => [],
      },
    } as unknown as EffectContext;

    await eff.resolve(ctx);
    expect(installed).toBe(true);
  });

  it("static canTrigger is false when host is in the breeding area (Q2370)", () => {
    const breedingPerm = makePerm({ inBreeding: true });
    const source = makeSource(breedingPerm, false); // not on battle area
    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    const eff = effects[0]!;
    const { ctx } = makeCtx({ source, trash: [inst(DARK_ANIMAL_ID)] });
    // canTrigger should be false: the staticModifier baseGuard requires isOnBattleArea()
    expect(eff.canTrigger(ctx)).toBe(false);
  });

  it("static canTrigger is true when host is on the battle area", () => {
    const perm = makePerm({ inBreeding: false });
    const source = makeSource(perm, true);
    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    const eff = effects[0]!;
    const { ctx } = makeCtx({ source });
    expect(eff.canTrigger(ctx)).toBe(true);
  });

  it("the installed watcher: matches only when the owner's hand was trashed (not opponent)", () => {
    // We can verify the matches logic by invoking the sub-trigger match gate directly.
    const perm = makePerm();
    const source = makeSource(perm, true);
    const effects = requireMod().effectsForTiming(EffectTiming.None, source);
    const eff = effects[0]!;

    let capturedMatches: ((ctx: EffectContext) => boolean) | undefined;
    const installCtx = {
      source,
      trigger: {},
      game: {
        player: () => ({ seat: 0, hand: [], trash: [], deck: [] }),
        definitionOf: (c: CardInstance) => definitionOf(c.cardId),
      },
      fx: {
        subscribeSubTrigger: (sub: { matches?: (ctx: EffectContext) => boolean }) => {
          capturedMatches = sub.matches;
          return 0;
        },
      },
      ask: { optional: async () => false, selectCards: async () => [] },
    } as unknown as EffectContext;

    eff.resolve(installCtx);

    // owner seat is 0 — matches when handTrashedSeat === 0
    const ownerCtx = { trigger: { handTrashedSeat: 0 } } as unknown as EffectContext;
    const opponentCtx = { trigger: { handTrashedSeat: 1 } } as unknown as EffectContext;
    expect(capturedMatches?.(ownerCtx)).toBe(true);
    expect(capturedMatches?.(opponentCtx)).toBe(false);
  });

  it("DARK_ANIMAL_ID card has the [Dark Animal] trait (test integrity check)", () => {
    const def = definitionOf(DARK_ANIMAL_ID);
    const allTraits = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
    expect(allTraits).toContain("Dark Animal");
    expect((def.kinds as CardKind[]).includes(CardKind.Digimon)).toBe(true);
  });
});
