import { describe, it, expect, beforeAll } from "vitest";
import { ArraySchema } from "@colyseus/schema";
import {
  GameState,
  PlayerState,
  Permanent,
  PendingDecision,
  CardInstance,
  Phase,
  CardColor,
  EffectTiming,
  type CardDefinition,
  type Seat,
} from "@aegis/shared";
import {
  validateActivateEffect,
  applyActivateEffect,
  ACTIVATE_TIMING,
  type ActivateEffectDeps,
} from "./activateEffect.js";
import { activated } from "../effects/builders.js";
import { registerCard } from "../effects/registry.js";
import { UseTracker } from "../effects/kernel.js";
import type { CardSource } from "../effects/CardSource.js";
import type { Effect } from "../effects/Effect.js";
import type { EffectContext, Primitives, DecisionApi } from "../effects/EffectContext.js";

/**
 * Unit coverage for the activateEffect verb (subsystem: intent-protocol-and-room).
 * Uses a synthetic EffectModule registered under a unique test cardId so it never
 * collides with implemented cards, and hand-built CardSource/EffectContext so the test
 * is independent of the card-data registry and the effect-primitives impl.
 */

const TEST_CARD_ID = "TEST-ACTIVATE";
const EFFECT_KEY = `${TEST_CARD_ID}/main-draw`;

let activations = 0;

beforeAll(() => {
  registerCard({
    cardId: TEST_CARD_ID,
    effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
      if (timing !== EffectTiming.OnDeclaration) return [];
      return [
        activated({
          source,
          effectKey: EFFECT_KEY,
          description: "[Main] Draw 1.",
          maxPerTurn: 1, // Once Per Turn
          resolve: async () => {
            activations += 1;
          },
        }),
      ];
    },
  });
});

const fakeDefinition: CardDefinition = {
  cardId: TEST_CARD_ID,
  set: "TEST",
  nameEn: "Test Activate",
  kinds: [],
  colors: [CardColor.Red],
  playCost: 0,
  dp: 0,
  evoCosts: [],
  maxCountInDeck: 4,
};

function makeState(turnSeat: Seat = 0): { state: GameState; permanent: Permanent; instance: CardInstance } {
  const state = new GameState();
  state.phase = Phase.Main;
  state.turnSeat = turnSeat;
  state.players = new ArraySchema<PlayerState>();
  for (const seat of [0, 1] as const) {
    const p = new PlayerState();
    p.seat = seat;
    state.players[seat] = p;
  }
  const instance = new CardInstance();
  instance.instanceId = "inst-1";
  instance.cardId = TEST_CARD_ID;
  instance.ownerSeat = 0;
  instance.faceUp = true;
  const permanent = new Permanent();
  permanent.permanentId = "perm-1";
  permanent.controllerSeat = 0;
  permanent.topCard = instance;
  state.players[0]!.battleArea.push(permanent);
  return { state, permanent, instance };
}

function makeDeps(
  state: GameState,
  permanent: Permanent,
  instance: CardInstance,
  tracker: UseTracker,
): ActivateEffectDeps {
  const source: CardSource = {
    instanceId: instance.instanceId,
    cardId: instance.cardId,
    ownerSeat: 0,
    definition: fakeDefinition,
    permanent: () => permanent,
    isOnBattleArea: () => true,
    isOwnersTurn: () => state.turnSeat === 0,
    hasColor: (c) => fakeDefinition.colors.includes(c),
  };
  const fx = {} as Primitives; // the synthetic effect uses no primitive
  const ask = {} as DecisionApi;
  const makeContext = (s: CardSource): EffectContext => ({ source: s, trigger: {}, game: {} as never, fx, ask });
  return {
    findInstance: (id) => (id === instance.instanceId ? { instance, permanent } : undefined),
    cardSourceOf: () => source,
    makeContext,
    tracker,
  };
}

describe("activateEffect", () => {
  it("the synthetic module surfaces its activated ability at the activation timing", () => {
    expect(ACTIVATE_TIMING).toBe(EffectTiming.OnDeclaration);
  });

  it("validates and runs the named [Main] ability", async () => {
    activations = 0;
    const { state, permanent, instance } = makeState(0);
    const deps = makeDeps(state, permanent, instance, new UseTracker());

    const check = validateActivateEffect(state, 0, { sourceInstanceId: "inst-1", effectKey: EFFECT_KEY }, deps);
    expect(check.ok).toBe(true);

    const result = await applyActivateEffect(state, 0, { sourceInstanceId: "inst-1", effectKey: EFFECT_KEY }, deps);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.outcome.effectKey).toBe(EFFECT_KEY);
    expect(activations).toBe(1);
  });

  it("rejects when it is not the sender's turn", () => {
    const { state, permanent, instance } = makeState(1); // seat 1's turn
    const deps = makeDeps(state, permanent, instance, new UseTracker());
    const check = validateActivateEffect(state, 0, { sourceInstanceId: "inst-1", effectKey: EFFECT_KEY }, deps);
    expect(check).toEqual({ ok: false, reason: "not-your-turn" });
  });

  it("rejects in the wrong phase", () => {
    const { state, permanent, instance } = makeState(0);
    state.phase = Phase.Breeding;
    const deps = makeDeps(state, permanent, instance, new UseTracker());
    const check = validateActivateEffect(state, 0, { sourceInstanceId: "inst-1", effectKey: EFFECT_KEY }, deps);
    expect(check).toEqual({ ok: false, reason: "wrong-phase" });
  });

  it("rejects an unknown effectKey on the card", () => {
    const { state, permanent, instance } = makeState(0);
    const deps = makeDeps(state, permanent, instance, new UseTracker());
    const check = validateActivateEffect(state, 0, { sourceInstanceId: "inst-1", effectKey: "nope" }, deps);
    expect(check).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("rejects a source the sender does not control", () => {
    const { state, permanent, instance } = makeState(0);
    permanent.controllerSeat = 1; // controlled by the opponent
    const deps = makeDeps(state, permanent, instance, new UseTracker());
    const check = validateActivateEffect(state, 0, { sourceInstanceId: "inst-1", effectKey: EFFECT_KEY }, deps);
    expect(check).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("enforces maxPerTurn: the second activation in a turn is rejected", async () => {
    activations = 0;
    const { state, permanent, instance } = makeState(0);
    const tracker = new UseTracker();
    const deps = makeDeps(state, permanent, instance, tracker);

    const first = await applyActivateEffect(state, 0, { sourceInstanceId: "inst-1", effectKey: EFFECT_KEY }, deps);
    expect(first.ok).toBe(true);

    // Once Per Turn: the kernel's per-turn limit now blocks re-activation.
    const second = validateActivateEffect(state, 0, { sourceInstanceId: "inst-1", effectKey: EFFECT_KEY }, deps);
    expect(second).toEqual({ ok: false, reason: "illegal-target" });

    // After a turn reset the ledger re-arms it.
    tracker.resetForNewTurn();
    const third = validateActivateEffect(state, 0, { sourceInstanceId: "inst-1", effectKey: EFFECT_KEY }, deps);
    expect(third.ok).toBe(true);
  });

  it("rejects when a decision is already open", () => {
    const { state, permanent, instance } = makeState(0);
    const deps = makeDeps(state, permanent, instance, new UseTracker());
    // Simulate an open decision via the synchronized field the contract gates on.
    const pending = new PendingDecision();
    pending.decisionId = "d1";
    pending.seat = 0;
    pending.kind = "optional";
    state.pendingDecision = pending;
    const check = validateActivateEffect(state, 0, { sourceInstanceId: "inst-1", effectKey: EFFECT_KEY }, deps);
    expect(check).toEqual({ ok: false, reason: "decision-pending" });
  });
});
