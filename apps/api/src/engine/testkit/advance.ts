import type { CardInstance, EffectDuration, EffectTiming, Permanent, Seat } from "@aegis/shared";
import type { GameEngine } from "../GameEngine.js";
import type { RemovalCause, SubTriggerEventName, TriggerInfo } from "../effects/EffectContext.js";
import { internalsOf } from "./internals.js";

/**
 * The Advance Surface: the Test Seam's small, named set of sub-intent engine drivers.
 *
 * Everything here drives production seams — the same fire paths and verbs a card's effect
 * body uses — for behavior no Intent can reach on its own (a timing that only fires as part
 * of a larger resolution, a verb no currently-implemented card exercises). It is deliberately a
 * back door, which is why it is named, documented and inside the seam rather than spread
 * across test files as casts.
 *
 * Prefer an Intent. Reach here only when no Intent produces the window under test, and say
 * in the test why.
 */
export function advance(engine: GameEngine) {
  const internals = internalsOf(engine);
  return {
    /**
     * Drive one complete production turn and voluntarily end its Main phase.
     * The caller arranges `turnSeat`/memory before entry when chaining hand-laid turns.
     */
    async runTurn(seat: Seat): Promise<void> {
      if (internals.state.turnSeat !== seat) {
        throw new Error(`Cannot run seat ${seat}'s turn while seat ${internals.state.turnSeat} is active`);
      }

      const turn = engine.runOneTurn();
      for (let i = 0; i < 500 && !internals.mainPhase.isOpen; i += 1) {
        await Promise.resolve();
      }
      if (!internals.mainPhase.isOpen) {
        throw new Error(`Seat ${seat}'s Main phase did not open`);
      }

      const ended = engine.applyIntent(seat, { type: "endPhase" });
      if (!ended.ok) {
        throw new Error(`Could not end seat ${seat}'s Main phase: ${ended.reason}`);
      }
      await turn;
    },

    /**
     * Privileged ledger access for tests that ARM engine state rather than observe it —
     * installing a synthetic restriction, keyword grant or SubTrigger watcher to assert the
     * production seam reacts to it.
     *
     * The long tail of the Test Seam. Every use is a test that could not express its setup
     * through a Board Spec or an Intent; prefer either. Reads belong in `observe()`, not here.
     */
    ledgers: {
      continuous: internals.continuous,
      modifiers: internals.modifiers,
      subTriggers: internals.subTriggers,
      tracker: internals.tracker,
    },

    /** Recompute continuous effects. Rarely needed: every intent already recomputes. */
    async recompute(): Promise<void> {
      await internals.recomputeContinuousEffects();
    },

    /** Fire a timing window on a battle-area permanent through the production fire seam. */
    async fire(timing: EffectTiming, permanent: Permanent): Promise<void> {
      await internals.recomputeContinuousEffects();
      await internals.fireTiming(timing, permanent);
      await internals.recomputeContinuousEffects();
    },

    /** Fire one permanent's timing with an explicit production trigger payload. */
    async fireForPermanent(timing: EffectTiming, permanent: Permanent, trigger: TriggerInfo = {}): Promise<void> {
      await internals.recomputeContinuousEffects();
      await internals.fireTimingForPermanent(timing, permanent, trigger);
      await internals.recomputeContinuousEffects();
    },

    /** Fire a timing window on a loose card instance (security, hand, trash). */
    async fireForInstance(timing: EffectTiming, instance: CardInstance): Promise<void> {
      await internals.recomputeContinuousEffects();
      await internals.fireTimingForInstance(timing, instance.instanceId);
      await internals.recomputeContinuousEffects();
    },

    /** Fire a named future-event watcher through the production SubTrigger bus. */
    async fireSubTrigger(event: SubTriggerEventName, payload: TriggerInfo = {}): Promise<void> {
      await internals.recomputeContinuousEffects();
      await internals.fireSubTrigger(event, payload);
      await internals.recomputeContinuousEffects();
    },

    /**
     * Effect-driven verbs. Each recomputes first so continuous watchers installed by other
     * permanents are armed, exactly as they would be mid-resolution.
     */
    verb: {
      async trash(instanceIds: string[], byEffectSeat?: Seat): Promise<void> {
        await internals.recomputeContinuousEffects();
        await internals.primitives.trash(instanceIds, {
          byEffectSeat: byEffectSeat ?? internals.state.turnSeat,
        });
      },
      async trashFromSecurity(seat: Seat, count: number, opts?: { fromTop?: boolean }): Promise<void> {
        await internals.recomputeContinuousEffects();
        await internals.primitives.trashFromSecurity(seat, count, opts);
        await internals.recomputeContinuousEffects();
      },
      async trashDigivolutionCards(hostPermanentId: string, instanceIds: string[], byEffectSeat?: Seat): Promise<void> {
        await internals.recomputeContinuousEffects();
        await internals.primitives.trashDigivolutionCards(hostPermanentId, instanceIds, { byEffectSeat });
        await internals.recomputeContinuousEffects();
      },
      /** Effect-driven deletion. Returns how many permanents were actually removed. */
      async deletePermanent(permanentIds: string[], cause?: RemovalCause): Promise<number> {
        await internals.recomputeContinuousEffects();
        const removed = await internals.primitives.deletePermanent(permanentIds, cause);
        await internals.recomputeContinuousEffects();
        return removed;
      },
      async modifyDP(permanentId: string, delta: number, duration: EffectDuration): Promise<void> {
        await internals.recomputeContinuousEffects();
        internals.primitives.modifyDP(permanentId, delta, duration);
        await internals.recomputeContinuousEffects();
      },
      async unsuspend(permanentIds: string[]): Promise<void> {
        await internals.recomputeContinuousEffects();
        await internals.primitives.unsuspend(permanentIds);
        await internals.recomputeContinuousEffects();
      },
      async suspend(permanentIds: string[], byEffectSeat?: Seat): Promise<void> {
        await internals.recomputeContinuousEffects();
        if (byEffectSeat === undefined) await internals.primitives.suspend(permanentIds);
        else await internals.primitives.suspend(permanentIds, { byEffectSeat });
        await internals.recomputeContinuousEffects();
      },
      async draw(seat: Seat, count: number): Promise<CardInstance[]> {
        await internals.recomputeContinuousEffects();
        return internals.drawCards(seat, count);
      },
      async returnToDeck(instanceIds: string[], opts?: { toTop?: boolean }): Promise<void> {
        await internals.recomputeContinuousEffects();
        await internals.primitives.returnToDeck(instanceIds, opts);
        await internals.recomputeContinuousEffects();
      },
      async returnToHand(instanceIds: string[]): Promise<void> {
        await internals.recomputeContinuousEffects();
        await internals.primitives.returnToHand(instanceIds);
        await internals.recomputeContinuousEffects();
      },
      async playInstances(instanceIds: string[], effectSourceCardId?: string): Promise<void> {
        await internals.recomputeContinuousEffects();
        await internals.primitives.playInstances(instanceIds, {
          payCost: false,
          ...(effectSourceCardId !== undefined ? { effectSourceCardId } : {}),
        });
        await internals.recomputeContinuousEffects();
      },
      /** Effect-driven digivolution through the production primitive. */
      async digivolveFromInstance(
        permanentId: string,
        instanceId: string,
        opts?: Parameters<typeof internals.primitives.digivolveFromInstance>[2],
      ): Promise<void> {
        await internals.recomputeContinuousEffects();
        await internals.primitives.digivolveFromInstance(permanentId, instanceId, opts);
        await internals.recomputeContinuousEffects();
      },
      /** Place an Option as a battle-area permanent without using its [Main] effect. */
      async placeOptionAsPermanent(instanceId: string): Promise<void> {
        await internals.recomputeContinuousEffects();
        await internals.primitives.placeOptionAsPermanent?.(instanceId);
        await internals.recomputeContinuousEffects();
      },
      /** Place loose cards under a permanent through the effect-driven production verb. */
      async placeUnder(permanentId: string, instanceIds: string[]): Promise<void> {
        await internals.recomputeContinuousEffects();
        await internals.primitives.placeUnder(permanentId, instanceIds);
        await internals.recomputeContinuousEffects();
      },
      /**
       * Play two tokens from WITHIN one resolving-effect window, mirroring a card body that
       * calls `playToken` twice (BT2-053 playing 2 [Diaboromon] Tokens). Both nested On Play
       * fires share one window token, which is what the KB Q2814 `oncePerTiming` dedup is
       * asserted against. Two separate calls open two windows instead.
       */
      async playTwoTokensInOneWindow(seat: Seat, tokenName: string): Promise<void> {
        await internals.recomputeContinuousEffects();
        const wasOutermost = internals.beginResolvingWindow();
        try {
          await internals.primitives.playToken(seat, tokenName, { payCost: false });
          await internals.primitives.playToken(seat, tokenName, { payCost: false });
        } finally {
          internals.endResolvingWindow(wasOutermost);
        }
        await internals.recomputeContinuousEffects();
      },
    },
  };
}
