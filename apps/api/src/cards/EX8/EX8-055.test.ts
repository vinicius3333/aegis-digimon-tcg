import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance, type Permanent, type Seat } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./EX8-055.js";

// A3 for EX8-055 (Pyramidimon) [End of Your Turn] "You may place up to 3 cards with the
// [Mineral]/[Rock] trait from your trash as this Digimon's bottom digivolution cards."
//
// KB Q3940: activating the effect but placing 0 cards is illegal — "if this card's [End
// of Your Turn] effect activates, you must place at least 1 card ... However, if you
// choose to not activate this effect, it won't activate and you don't place any cards."
// Q3939 confirms declining the whole effect is fine.
//
// The old single-action IR (`upTo: true, count: 3`) issued ONE selectCards decision with
// min:0 — a compliant client could submit 0 mid-activation, contradicting Q3940. The fix
// splits the placement into two PlaceUnder actions: the first mandatory (count:1, no
// upTo — min:1/max:1 once there's more than one candidate, and auto-forced with exactly
// one candidate), the second optional (count:2, upTo:true — min:0/max:2). Together they
// advertise an effective 1-3 range to any client, never a 0-3 range.
//
// FAILS-WHEN-REVERTED: restoring the single `upTo:true, count:3` action makes the first
// (and only) selectCards decision request min:0 instead of min:1.

const cardId = "EX8-055";

function fakeDef(cid: string, over: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId: cid,
    set: cid.split("-")[0]!,
    nameEn: cid,
    kinds: ["Digimon"] as never,
    colors: ["Black"] as never,
    playCost: 0,
    dp: 0,
    evoCosts: [],
    maxCountInDeck: 4,
    types: [],
    ...over,
  } as CardDefinition;
}

function mineralCard(instanceId: string): CardInstance {
  return { instanceId, cardId: `TRAIT-${instanceId}`, ownerSeat: 0 as Seat, faceUp: true } as CardInstance;
}

function makeSelfPerm(stack: CardInstance[] = []): Permanent {
  return {
    permanentId: "PERM#pyramidimon",
    controllerSeat: 0 as Seat,
    topCard: { instanceId: "INST#EX8-055", cardId, ownerSeat: 0 as Seat, faceUp: true } as CardInstance,
    stack,
    baseDP: 12000,
    currentDP: 12000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function makeSource(selfPerm: Permanent): CardSource {
  return {
    instanceId: selfPerm.topCard!.instanceId,
    cardId,
    ownerSeat: 0 as Seat,
    definition: fakeDef(cardId),
    permanent: () => selfPerm,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
  };
}

interface SelectCall {
  candidates: string[];
  min: number;
  max: number;
}

function makeCtx(opts: {
  selfPerm: Permanent;
  trash: CardInstance[];
  selectCalls: SelectCall[];
  placeUnderCalls: { hostId: string; instanceIds: string[] }[];
  /** How many cards to hand back per selectCards call, in call order. */
  picks: number[];
}): EffectContext {
  const { selfPerm, trash, selectCalls, placeUnderCalls, picks } = opts;

  const p0 = { seat: 0 as Seat, battleArea: [selfPerm], security: [], hand: [], deck: [], trash };
  const p1 = { seat: 1 as Seat, battleArea: [], security: [], hand: [], deck: [], trash: [] };

  const game: GameAccess = {
    state: { players: [p0, p1] } as never,
    player: (seat: Seat) => (seat === 0 ? p0 : p1) as never,
    opponentOf: (s: Seat) => (s === 0 ? 1 : 0) as Seat,
    permanentById: (id: string) => (id === selfPerm.permanentId ? selfPerm : undefined),
    definitionOf: (card: { cardId: string }) => {
      if (card.cardId === cardId) return fakeDef(cardId);
      // Every trash instance in this test carries the [Mineral] trait.
      return fakeDef(card.cardId, { types: ["Mineral"] });
    },
  } as unknown as GameAccess;

  const fx = {
    placeUnder: async (hostId: string, instanceIds: string[]) => {
      placeUnderCalls.push({ hostId, instanceIds });
      // Move the placed cards out of the trash so the next action doesn't re-offer them
      // (mirrors the real placeUnder primitive).
      for (const iid of instanceIds) {
        const idx = trash.findIndex((c) => c.instanceId === iid);
        if (idx >= 0) trash.splice(idx, 1);
      }
    },
  } as unknown as Primitives;

  let callIndex = 0;
  const ask: DecisionApi = {
    optional: async () => true,
    chooseTargets: async () => [],
    selectPermanents: async () => [],
    selectCards: async (_ctx, o) => {
      selectCalls.push({ candidates: [...o.candidates], min: o.min, max: o.max });
      const want = picks[callIndex] ?? 0;
      callIndex += 1;
      return o.candidates.slice(0, want);
    },
    chooseOption: async () => 0,
  };

  return { source: makeSource(selfPerm), trigger: {}, game, fx, ask };
}

describe("EX8-055 (Pyramidimon) registration", () => {
  it("is registered and exposes an EndOfYourTurn effect", () => {
    const module = getEffectModule(cardId);
    expect(module).toBeDefined();
    const effects = module!.effectsForTiming(EffectTiming.OnEndTurn, makeSource(makeSelfPerm()));
    expect(effects.length).toBeGreaterThanOrEqual(1);
  });
});

describe("EX8-055 [End of Your Turn] placement is optional overall, but min-1 once entered", () => {
  it("CONTROL: declining the whole effect is legal (optional:true at the effect level)", () => {
    const module = getEffectModule(cardId)!;
    const effects = module.effectsForTiming(EffectTiming.OnEndTurn, makeSource(makeSelfPerm()));
    const endOfTurn = effects[0]!;
    // Q3939: "if you choose to not activate this effect, it won't activate and you don't
    // place any cards" — the kernel only offers/runs this when `optional` is true, so a
    // decline never calls `resolve` at all (0 cards placed, 0 decisions asked).
    expect(endOfTurn.optional).toBe(true);
  });

  it("FAILS-WHEN-REVERTED: once activated, the mandatory placement is offered as min:1/max:1 — never min:0", async () => {
    const module = getEffectModule(cardId)!;
    const selfPerm = makeSelfPerm();
    const trash = [mineralCard("t1"), mineralCard("t2"), mineralCard("t3")];
    const selectCalls: SelectCall[] = [];
    const placeUnderCalls: { hostId: string; instanceIds: string[] }[] = [];
    const ctx = makeCtx({ selfPerm, trash, selectCalls, placeUnderCalls, picks: [1, 0] });

    const effects = module.effectsForTiming(EffectTiming.OnEndTurn, makeSource(selfPerm));
    await effects[0]!.resolve(ctx);

    // The FIRST selection (the mandatory placement) must request min 1 — a compliant
    // client structurally cannot submit 0 for it. With the old `upTo:true, count:3`
    // IR this would be min:0 (the bug Q3940 forbids).
    expect(selectCalls[0]).toBeDefined();
    expect(selectCalls[0]!.min).toBe(1);
    expect(selectCalls[0]!.max).toBe(1);

    // The SECOND selection (the additional up-to-2) is genuinely optional.
    expect(selectCalls[1]).toBeDefined();
    expect(selectCalls[1]!.min).toBe(0);
    expect(selectCalls[1]!.max).toBe(2);

    // At least 1 card was actually placed under the host once activated.
    const totalPlaced = placeUnderCalls.reduce((n, c) => n + c.instanceIds.length, 0);
    expect(totalPlaced).toBeGreaterThanOrEqual(1);
  });

  it("places up to 3 total when the controller takes the maximum at each step", async () => {
    const module = getEffectModule(cardId)!;
    const selfPerm = makeSelfPerm();
    const trash = [mineralCard("t1"), mineralCard("t2"), mineralCard("t3")];
    const selectCalls: SelectCall[] = [];
    const placeUnderCalls: { hostId: string; instanceIds: string[] }[] = [];
    const ctx = makeCtx({ selfPerm, trash, selectCalls, placeUnderCalls, picks: [1, 2] });

    const effects = module.effectsForTiming(EffectTiming.OnEndTurn, makeSource(selfPerm));
    await effects[0]!.resolve(ctx);

    const totalPlaced = placeUnderCalls.reduce((n, c) => n + c.instanceIds.length, 0);
    expect(totalPlaced).toBe(3);
    expect(trash).toHaveLength(0);
  });
});
