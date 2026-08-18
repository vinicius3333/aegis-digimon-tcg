import { describe, it, expect } from "vitest";
import { EffectTiming, type CardDefinition, type CardInstance, type GameState, type Permanent, type Seat } from "@aegis/shared";
import { SubTriggerRegistry } from "../../engine/effects/subtriggers.js";
import { consultLeavePrevention } from "../../engine/effects/leavePrevention.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { DecisionApi, EffectContext, GameAccess, Primitives } from "../../engine/effects/EffectContext.js";
import "./ST19-02.js";

// A3 for ST19-02 (Angewomon (X Antibody)) — ＜Barrier＞ ONCE PER TURN.
//
// ＜Barrier＞ negates a deletion of this Digimon, but only ONCE PER TURN. The fix adds an
// `oncePerTurnKey` to the prevention subscription that the leave-prevention consult honors via the
// host's per-turn ledger.
//
// FAILS-WHEN-REVERTED: remove the `oncePerTurnKey` (or the consult's gating) and the SECOND deletion
// the same turn is also negated → the "second deletion is NOT prevented" assertion goes RED.

function fakeCardInstance(cardId: string, instanceId: string): CardInstance {
  return { cardId, instanceId, ownerSeat: 0 as Seat, faceUp: true } as never;
}

function fakePermanent(permanentId: string, topCardId: string): Permanent {
  return {
    permanentId,
    controllerSeat: 0 as Seat,
    topCard: fakeCardInstance(topCardId, "top-" + permanentId),
    stack: [],
    linked: [],
    baseDP: 5000,
    currentDP: 5000,
    isSuspended: false,
    inBreeding: false,
  } as unknown as Permanent;
}

function fakeDefinition(cardId: string): CardDefinition {
  return {
    cardId,
    set: cardId.split("-")[0]!,
    nameEn: cardId,
    kinds: ["Digimon"] as never,
    colors: ["Yellow"] as never,
    playCost: 5,
    dp: 5000,
    evoCosts: [],
    maxCountInDeck: 4,
  };
}

describe("ST19-02 ＜Barrier＞ is once per turn", () => {
  it("negates the first deletion this turn but NOT the second", async () => {
    const st19 = fakePermanent("perm-st19-02", "ST19-02");
    const players = [
      { seat: 0 as Seat, battleArea: [st19], security: [], hand: [], deck: [], trash: [] },
      { seat: 1 as Seat, battleArea: [], security: [], hand: [], deck: [], trash: [] },
    ];
    const state = { memory: 3, players, turnSeat: 1 } as unknown as GameState;

    const subTriggers = new SubTriggerRegistry();
    const game: GameAccess = {
      state,
      player: (seat: Seat) => players[seat] as never,
      opponentOf: (s) => (s === 0 ? 1 : 0) as Seat,
      permanentById: (id: string) => (id === st19.permanentId ? st19 : undefined),
      definitionOf: (card: CardInstance) => fakeDefinition(card.cardId),
    };
    const fx = {
      subscribeReplacement: (sub: Parameters<SubTriggerRegistry["subscribeReplacement"]>[0]) =>
        subTriggers.subscribeReplacement(sub),
      deletePermanent: async (ids: string[]) => ids.length,
    } as unknown as Primitives;
    const ask: DecisionApi = {
      optional: async () => true, // always accept ＜Barrier＞
      chooseTargets: async (_c, o) => o.candidates.slice(0, o.max),
      selectPermanents: async (_c, o) => o.candidates.slice(0, o.max),
      selectCards: async (_c, o) => o.candidates.slice(0, o.max),
      chooseOption: async () => 0,
    };
    const source: CardSource = {
      instanceId: "INST#ST19-02",
      cardId: "ST19-02",
      ownerSeat: 0 as Seat,
      definition: fakeDefinition("ST19-02"),
      permanent: () => st19,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => false,
    };
    const ctx: EffectContext = { source, trigger: {}, game, fx, ask };

    // Install ST19-02's static replacements (Decoy + Barrier).
    const module = getEffectModule("ST19-02");
    for (const effect of module!.effectsForTiming(EffectTiming.None, source)) {
      await effect.resolve(ctx);
    }

    // A real per-turn ledger (mirrors GameEngine's UseTracker-backed host methods).
    const firedKeys = new Set<string>();
    const host = {
      subTriggers,
      permanentById: (id: string) => (id === st19.permanentId ? st19 : undefined),
      buildContext: (_srcPerm: Permanent, _leavingId: string): EffectContext => ctx,
      turnSeat: 1 as Seat,
      oncePerTurnFired: (key: string) => firedKeys.has(key),
      markOncePerTurnFired: (key: string) => firedKeys.add(key),
    };

    const consult = () =>
      consultLeavePrevention(host, [st19.permanentId], "byEffect", 1 as Seat, { reentryGuard: { active: false } });

    // First deletion this turn: ＜Barrier＞ negates it.
    const first = await consult();
    expect(first.has(st19.permanentId)).toBe(true);

    // Second deletion the SAME turn (ledger not reset): ＜Barrier＞ is spent → NOT prevented.
    const second = await consult();
    expect(second.has(st19.permanentId)).toBe(false);

    // After the per-turn ledger resets (new turn), ＜Barrier＞ is available again.
    firedKeys.clear();
    const nextTurn = await consult();
    expect(nextTurn.has(st19.permanentId)).toBe(true);
  });
});
