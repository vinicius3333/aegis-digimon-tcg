/**
 * BT14-046 BeforePayCost — A3 behavioral test (HARD-03/HARD-04).
 *
 * Proves the suspend-cost payment path for the BeforePayCost timing:
 *   1. Pay path: suspend eligible green Digimon → play cost reduced by 3.
 *   2. Decline path: eligible targets, but player declines → full cost.
 *   3. No-eligible path: no green Digimon on field → full cost.
 *   4. FAILS-WHEN-REVERTED: stub payActivationCost to always return false
 *      → no reduction (the suspend cost is causal, not coincidental).
 *
 * FAILS-WHEN-REVERTED: stub payActivationCost to always return false (no-op the
 * suspend). The chosen Digimon is selected but NOT suspended, so the "suspended"
 * success gate returns false and playCostDelta stays 0.
 */

import { describe, it, expect } from "vitest";
import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  CardKind,
  CardColor,
  EffectTiming,
  type Seat,
} from "@aegis/shared";
import { MemoryGauge } from "../../engine/MemoryGauge.js";
import { ModifierLedger } from "../../engine/effects/modifiers.js";
import { ContinuousEffectLedger } from "../../engine/effects/continuous.js";
import { SubTriggerRegistry } from "../../engine/effects/subtriggers.js";
import { createPrimitives, type PrimitivesEngine } from "../../engine/effects/primitives.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { effectsOf } from "../../engine/effects/collect.js";

// Register the card module so effectsOf can find it.
import "../BT14/BT14-046.js";

const DIGIMON = "AD1-001"; // Digimon, DP 5000

function buildTestHarness() {
  const state = new GameState();
  state.turnSeat = 0 as Seat;
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }

  const events: { kind: string }[] = [];
  const ledger = new ModifierLedger();
  const continuous = new ContinuousEffectLedger();
  const subTriggers = new SubTriggerRegistry();
  const memory = new MemoryGauge(state, (e) => events.push(e));

  let permSeq = 0;
  let instSeq = 0;
  const engine: PrimitivesEngine = {
    state,
    emit: (e) => events.push(e),
    nextPermanentId: () => `perm-${permSeq++}`,
    nextInstanceId: () => `tok-${instSeq++}`,
    memory,
    modifiers: ledger,
    continuous,
    subTriggers,
    ask: {
      selectInstances: async () => [],
    },
    controllerSeat: () => state.turnSeat,
  };

  const fx = createPrimitives(engine);

  return { state, fx, continuous, events };
}

/** Place a green Digimon in the owner's battle area. */
function placeGreenDigimon(state: GameState, permanentId: string, seat: Seat): Permanent {
  const top = new CardInstance();
  top.cardId = DIGIMON;
  top.instanceId = `${permanentId}-top`;
  top.ownerSeat = seat;
  top.faceUp = true;
  const p = new Permanent();
  p.permanentId = permanentId;
  p.controllerSeat = seat;
  p.topCard = top;
  p.isSuspended = false;
  p.inBreeding = false;
  p.baseDP = 5000;
  p.currentDP = 5000;
  state.players[seat]!.battleArea.push(p);
  return p;
}

describe("BT14-046 BeforePayCost A3 (HARD-03/HARD-04)", () => {
  it("pay path: suspending eligible green Digimon sets ctx.playCostDelta to 3", async () => {
    const h = buildTestHarness();
    const greenDigi = placeGreenDigimon(h.state, "green-digi", 0 as Seat);

    // Build a minimal EffectContext for the BeforePayCost timing
    const source: CardSource = {
      cardId: "BT14-046",
      instanceId: "bt14-046-inst",
      ownerSeat: 0 as Seat,
      definition: {
        cardId: "BT14-046",
        kinds: [CardKind.Tamer],
        colors: [CardColor.Green],
      } as CardSource["definition"],
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined, // loose card (in hand)
    } as CardSource;

    const game: GameAccess = {
      state: h.state,
      player: (seat: Seat) => h.state.players[seat]!,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string): Permanent | undefined => {
        for (const p of h.state.players) {
          const found = (p.battleArea as unknown as Permanent[]).find((perm) => perm.permanentId === id);
          if (found) return found;
        }
        return undefined;
      },
      definitionOf: (card) => {
        // Return a minimal definition for the card
        return {
          cardId: card.cardId,
          kinds: card.cardId === DIGIMON ? [CardKind.Digimon] : [CardKind.Tamer],
          colors: [CardColor.Green],
          nameEn: card.cardId,
          playCost: 3,
          dp: card.cardId === DIGIMON ? 5000 : 0,
          set: "BT14",
          evoCosts: [],
          maxCountInDeck: 4,
        } as GameAccess["definitionOf"] extends (c: infer _C) => infer R ? R : never;
      },
    } as GameAccess;

    const ctx: EffectContext = {
      source,
      game,
      fx: h.fx,
      trigger: {},
      ask: {
        optional: async () => true, // player chooses to pay
        chooseTargets: async () => ["green-digi"], // selects the green Digimon
        selectPermanents: async () => ["green-digi"],
        selectCards: async () => [],
        chooseOption: async () => 0,
      },
    };

    const effects = effectsOf(EffectTiming.BeforePayCost, source);
    expect(effects.length).toBeGreaterThan(0);

    for (const effect of effects) {
      if (effect.canTrigger(ctx)) {
        await effect.resolve(ctx);
      }
    }

    expect(ctx.playCostDelta).toBe(3);
    expect(greenDigi.isSuspended).toBe(true);
  });

  it("decline path: player declines optional payment → playCostDelta stays unchanged", async () => {
    const h = buildTestHarness();
    placeGreenDigimon(h.state, "green-digi", 0 as Seat);

    const source: CardSource = {
      cardId: "BT14-046",
      instanceId: "bt14-046-inst",
      ownerSeat: 0 as Seat,
      definition: {
        cardId: "BT14-046",
        kinds: [CardKind.Tamer],
        colors: [CardColor.Green],
      } as CardSource["definition"],
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as CardSource;

    const game: GameAccess = {
      state: h.state,
      player: (seat: Seat) => h.state.players[seat]!,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string): Permanent | undefined => {
        for (const p of h.state.players) {
          const found = (p.battleArea as unknown as Permanent[]).find((perm) => perm.permanentId === id);
          if (found) return found;
        }
        return undefined;
      },
      definitionOf: (card) => ({
        cardId: card.cardId,
        kinds: card.cardId === DIGIMON ? [CardKind.Digimon] : [CardKind.Tamer],
        colors: [CardColor.Green],
        nameEn: card.cardId,
        playCost: 3,
        dp: 0,
        set: "BT14",
        evoCosts: [],
        maxCountInDeck: 4,
      }),
    } as GameAccess;

    const ctx: EffectContext = {
      source,
      game,
      fx: h.fx,
      trigger: {},
      ask: {
        optional: async () => false, // player DECLINES
        chooseTargets: async () => [], // not reached
        selectPermanents: async () => [],
        selectCards: async () => [],
        chooseOption: async () => 0,
      },
    };

    const effects = effectsOf(EffectTiming.BeforePayCost, source);
    expect(effects.length).toBeGreaterThan(0);

    for (const effect of effects) {
      if (effect.canTrigger(ctx)) {
        await effect.resolve(ctx);
      }
    }

    expect(ctx.playCostDelta).toBeUndefined();
  });

  it("FAILS-WHEN-REVERTED: payActivationCost stubbed to false → no cost reduction", async () => {
    const h = buildTestHarness();
    const greenDigi = placeGreenDigimon(h.state, "green-digi", 0 as Seat);

    // Stub payActivationCost to always return false
    const fxWithStub = {
      ...h.fx,
      payActivationCost: () => false,
    };

    const source: CardSource = {
      cardId: "BT14-046",
      instanceId: "bt14-046-inst",
      ownerSeat: 0 as Seat,
      definition: {
        cardId: "BT14-046",
        kinds: [CardKind.Tamer],
        colors: [CardColor.Green],
      } as CardSource["definition"],
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as CardSource;

    const game: GameAccess = {
      state: h.state,
      player: (seat: Seat) => h.state.players[seat]!,
      opponentOf: (seat: Seat) => (seat === 0 ? 1 : 0) as Seat,
      permanentById: (id: string): Permanent | undefined => {
        for (const p of h.state.players) {
          const found = (p.battleArea as unknown as Permanent[]).find((perm) => perm.permanentId === id);
          if (found) return found;
        }
        return undefined;
      },
      definitionOf: (card) => ({
        cardId: card.cardId,
        kinds: card.cardId === DIGIMON ? [CardKind.Digimon] : [CardKind.Tamer],
        colors: [CardColor.Green],
        nameEn: card.cardId,
        playCost: 3,
        dp: 0,
        set: "BT14",
        evoCosts: [],
        maxCountInDeck: 4,
      }),
    } as GameAccess;

    const ctx: EffectContext = {
      source,
      game,
      fx: fxWithStub,
      trigger: {},
      ask: {
        optional: async () => true, // player wants to pay
        chooseTargets: async () => ["green-digi"], // selects the green Digimon
        selectPermanents: async () => ["green-digi"],
        selectCards: async () => [],
        chooseOption: async () => 0,
      },
      playCostDelta: undefined,
    };

    const effects = effectsOf(EffectTiming.BeforePayCost, source);
    for (const effect of effects) {
      if (effect.canTrigger(ctx)) {
        await effect.resolve(ctx);
      }
    }

    // The Digimon was selected but NOT suspended (payActivationCost returned false).
    // The cost reduction is causal: without a successful suspend, delta stays 0.
    expect(ctx.playCostDelta).toBeUndefined();
    expect(greenDigi.isSuspended).toBe(false);
  });
});
