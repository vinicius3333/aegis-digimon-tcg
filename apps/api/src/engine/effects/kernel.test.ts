import { describe, it, expect } from "vitest";
import type { Seat } from "@aegis/shared";
import type { CardSource } from "./CardSource.js";
import type { EffectContext, GameAccess } from "./EffectContext.js";
import type { Effect } from "./Effect.js";
import {
  UseTracker,
  isOverMaxPerTurn,
  passesPlacementGuard,
  canTrigger,
  canActivate,
} from "./kernel.js";
import { onPlay, security, staticModifier, whenAttacking } from "./builders.js";

// --- Lightweight fakes (the kernel and builders are pure; no real schema needed) ---

function fakeSource(over: Partial<CardSource> = {}): CardSource {
  return {
    instanceId: "BT0-001#1",
    cardId: "BT0-001",
    ownerSeat: 0 as Seat,
    definition: { cardId: "BT0-001", set: "BT0", nameEn: "Fake", kinds: [], colors: [], playCost: 0, dp: 0, evoCosts: [], maxCountInDeck: 4 },
    permanent: () => undefined,
    isOnBattleArea: () => true,
    isOwnersTurn: () => true,
    hasColor: () => false,
    ...over,
  };
}

function fakeContext(source: CardSource, gameOver: Partial<GameAccess> = {}): EffectContext {
  const game: GameAccess = {
    state: {} as never,
    player: () => ({}) as never,
    opponentOf: (s) => (s === 0 ? 1 : 0),
    permanentById: () => undefined,
    definitionOf: () => ({ cardId: "x", set: "x", nameEn: "x", kinds: [], colors: [], playCost: 0, dp: 0, evoCosts: [], maxCountInDeck: 4 }),
    ...gameOver,
  };
  return { source, trigger: {}, game, fx: {} as never, ask: {} as never };
}

describe("UseTracker / isOverMaxPerTurn", () => {
  it("treats maxPerTurn <= 0 as unlimited", () => {
    const tracker = new UseTracker();
    const eff = onPlay({ source: fakeSource(), effectKey: "k", description: "", maxPerTurn: -1, resolve: async () => {} });
    tracker.register("BT0-001#1", "k");
    tracker.register("BT0-001#1", "k");
    expect(isOverMaxPerTurn(eff, tracker, "BT0-001#1")).toBe(false);
  });

  it("is over the limit only once recorded uses reach maxPerTurn (>=, like the source)", () => {
    const tracker = new UseTracker();
    const eff = onPlay({ source: fakeSource(), effectKey: "k", description: "", maxPerTurn: 1, resolve: async () => {} });
    expect(isOverMaxPerTurn(eff, tracker, "BT0-001#1")).toBe(false);
    tracker.register("BT0-001#1", "k");
    expect(isOverMaxPerTurn(eff, tracker, "BT0-001#1")).toBe(true); // 1 >= 1
  });

  it("counts uses per (instance, effectKey), not globally", () => {
    const tracker = new UseTracker();
    tracker.register("A#1", "k");
    expect(tracker.count("A#1", "k")).toBe(1);
    expect(tracker.count("A#2", "k")).toBe(0);
    expect(tracker.count("A#1", "other")).toBe(0);
  });

  it("unregister undoes a use and resetForNewTurn clears all", () => {
    const tracker = new UseTracker();
    tracker.register("A#1", "k");
    tracker.register("A#1", "k");
    tracker.unregister("A#1", "k");
    expect(tracker.count("A#1", "k")).toBe(1);
    tracker.resetForNewTurn();
    expect(tracker.count("A#1", "k")).toBe(0);
  });
});

describe("canTrigger / canActivate gating", () => {
  it("canTrigger fails when over the per-turn limit even if the predicate passes", () => {
    const tracker = new UseTracker();
    const source = fakeSource();
    const eff = onPlay({ source, effectKey: "k", description: "", maxPerTurn: 1, when: () => true, resolve: async () => {} });
    const ctx = fakeContext(source);
    expect(canTrigger(eff, ctx, tracker)).toBe(true);
    tracker.register(source.instanceId, "k");
    expect(canTrigger(eff, ctx, tracker)).toBe(false);
  });

  it("canTrigger ANDs the builder's entering-subject base guard with the card's when", () => {
    const source = fakeSource({ permanent: () => ({ permanentId: "MINE" }) as never });
    const eff = onPlay({ source, effectKey: "k", description: "", when: () => true, resolve: async () => {} });
    // The board-wide broadcast names ANOTHER permanent as the entering subject, so this
    // source's [On Play] stays silent despite when() being true.
    const otherEntered: EffectContext = {
      ...fakeContext(source),
      trigger: { subjectPermanentId: "SOMEONE-ELSE" },
    };
    expect(canTrigger(eff, otherEntered, new UseTracker())).toBe(false);
    expect(canTrigger(eff, fakeContext(source), new UseTracker())).toBe(true);
  });

  it("security and onDeletion builders do NOT require on-field", () => {
    const offField = fakeSource({ isOnBattleArea: () => false });
    const sec = security({ source: offField, effectKey: "s", description: "", resolve: async () => {} });
    expect(canTrigger(sec, fakeContext(offField), new UseTracker())).toBe(true);
  });
});

describe("passesPlacementGuard (inherited/linked vs printed)", () => {
  // A permanent whose top card is "top#1" and whose stack holds "ess#1".
  const permanent = {
    permanentId: "p1",
    controllerSeat: 0 as Seat,
    topCard: { instanceId: "top#1", cardId: "TOP", ownerSeat: 0 as Seat, faceUp: true },
    stack: [{ instanceId: "ess#1", cardId: "ESS", ownerSeat: 0 as Seat, faceUp: true }],
    linked: [],
  } as never;

  const digimonTop: Partial<GameAccess> = {
    definitionOf: () => ({ cardId: "TOP", set: "x", nameEn: "x", kinds: ["Digimon"] as never, colors: [], playCost: 0, dp: 1000, evoCosts: [], maxCountInDeck: 4 }),
  };

  it("inherited effect activates only when its source is a STACK card (not the top)", () => {
    const essSource = fakeSource({ instanceId: "ess#1", permanent: () => permanent });
    const eff: Effect = whenAttacking({ source: essSource, effectKey: "k", description: "", isInherited: true, resolve: async () => {} });
    expect(passesPlacementGuard(eff, fakeContext(essSource, digimonTop))).toBe(true);

    // If the same effect's source were the top card, the inherited effect is gone.
    const topSource = fakeSource({ instanceId: "top#1", permanent: () => permanent });
    expect(passesPlacementGuard(eff, fakeContext(topSource, digimonTop))).toBe(false);
  });

  it("printed (non-inherited) effect activates only when its source IS the top card", () => {
    const topSource = fakeSource({ instanceId: "top#1", permanent: () => permanent });
    const eff: Effect = onPlay({ source: topSource, effectKey: "k", description: "", resolve: async () => {} });
    expect(passesPlacementGuard(eff, fakeContext(topSource, digimonTop))).toBe(true);

    const essSource = fakeSource({ instanceId: "ess#1", permanent: () => permanent });
    const printed: Effect = onPlay({ source: essSource, effectKey: "k", description: "", resolve: async () => {} });
    expect(passesPlacementGuard(printed, fakeContext(essSource, digimonTop))).toBe(false);
  });

  it("does not gate a source that is not on any permanent (e.g. in hand)", () => {
    const inHand = fakeSource({ instanceId: "h#1", permanent: () => undefined });
    const eff: Effect = onPlay({ source: inHand, effectKey: "k", description: "", isInherited: true, resolve: async () => {} });
    expect(passesPlacementGuard(eff, fakeContext(inHand))).toBe(true);
  });

  it("inherited effect from an off-field source (deleted card) gates on deletedWasStackInstanceIds", () => {
    // When a card is deleted and found in trash, `permanent()` is undefined.
    // The placement guard MUST NOT allow inherited effects to fire from a
    // card that was the TOP card of the deleted permanent.
    const inTrash = fakeSource({ instanceId: "top#1", permanent: () => undefined });
    const eff: Effect = onPlay({ source: inTrash, effectKey: "k", description: "", isInherited: true, resolve: async () => {} });

    // Source was a TOP card (NOT in deletedWasStackInstanceIds) → gate FAILS.
    const ctxTop = fakeContext(inTrash);
    ctxTop.trigger = { deletedWasStackInstanceIds: ["ess#1"], deletedInstanceIds: ["top#1", "ess#1"] };
    expect(passesPlacementGuard(eff, ctxTop)).toBe(false);

    // Source was a STACK card (IN deletedWasStackInstanceIds) → gate PASSES.
    const ctxStack = fakeContext(inTrash);
    ctxStack.trigger = { deletedWasStackInstanceIds: ["top#1", "ess#1"], deletedInstanceIds: ["top#1", "ess#1"] };
    const effStack: Effect = onPlay({ source: fakeSource({ instanceId: "top#1", permanent: () => undefined }), effectKey: "k2", description: "", isInherited: true, resolve: async () => {} });
    expect(passesPlacementGuard(effStack, ctxStack)).toBe(true);

    // No deletedWasStackInstanceIds in trigger → backward compatible (returns true).
    const ctxNoInfo = fakeContext(inTrash);
    expect(passesPlacementGuard(eff, ctxNoInfo)).toBe(true);
  });

  it("does not activate a buried card's own printed effect when its host is deleted", () => {
    const buriedSource = fakeSource({ instanceId: "source#1", permanent: () => undefined });
    const printed = onPlay({
      source: buriedSource,
      effectKey: "printed-on-deletion-shape",
      description: "",
      resolve: async () => {},
    });
    const ctx = fakeContext(buriedSource);
    ctx.trigger = {
      deletedInstanceIds: ["top#1", "source#1"],
      deletedWasStackInstanceIds: ["source#1"],
    };

    expect(passesPlacementGuard(printed, ctx)).toBe(false);
  });

  it("still activates the deleted top card's own printed effect", () => {
    const topSource = fakeSource({ instanceId: "top#1", permanent: () => undefined });
    const printed = onPlay({
      source: topSource,
      effectKey: "printed-top-on-deletion-shape",
      description: "",
      resolve: async () => {},
    });
    const ctx = fakeContext(topSource);
    ctx.trigger = {
      deletedInstanceIds: ["top#1", "source#1"],
      deletedWasStackInstanceIds: ["source#1"],
    };

    expect(passesPlacementGuard(printed, ctx)).toBe(true);
  });

  it("canActivate combines the placement guard, the predicate, and the per-turn limit", () => {
    const tracker = new UseTracker();
    const topSource = fakeSource({ instanceId: "top#1", permanent: () => permanent });
    const eff = whenAttacking({
      source: topSource,
      effectKey: "k",
      description: "",
      isInherited: true, // inherited but source is the top card => placement guard fails
      resolve: async () => {},
    });
    expect(canActivate(eff, fakeContext(topSource, digimonTop), tracker)).toBe(false);
  });
});

describe("builders carry flags through to the Effect", () => {
  it("sets optional / isInherited / isSecurity / maxPerTurn correctly", () => {
    const source = fakeSource();
    const sec = security({ source, effectKey: "s", description: "d", resolve: async () => {} });
    expect(sec.isSecurity).toBe(true);

    const evo = staticModifier({ source, effectKey: "m", description: "d", resolve: async () => {} });
    expect(evo.isSecurity).toBe(false);
    expect(evo.maxPerTurn).toBe(-1);

    const opt = onPlay({ source, effectKey: "o", description: "d", optional: true, isInherited: true, maxPerTurn: 1, resolve: async () => {} });
    expect(opt.optional).toBe(true);
    expect(opt.isInherited).toBe(true);
    expect(opt.maxPerTurn).toBe(1);
  });

  it("defaults: not optional, not inherited, unlimited", () => {
    const source = fakeSource();
    const eff = onPlay({ source, effectKey: "k", description: "d", resolve: async () => {} });
    expect(eff.optional).toBe(false);
    expect(eff.isInherited).toBe(false);
    expect(eff.isLinked).toBe(false);
    expect(eff.maxPerTurn).toBe(-1);
  });
});
