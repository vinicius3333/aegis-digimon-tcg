import { EffectTiming, Phase, type CardInstance, type EffectDuration, type Permanent, type Seat } from "@aegis/shared";
import type { GameEngine } from "../GameEngine.js";
import type { Primitives, RemovalCause, SubTriggerEventName, TriggerInfo } from "../effects/EffectContext.js";
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
    /** Supplemental fault injection; this is not a legal in-game replacement producer. */
    failNextSuspension(): () => void {
      const original = internals.primitives.suspend;
      function restore(): void {
        internals.primitives.suspend = original;
      }
      internals.primitives.suspend = async function failedSuspension(): Promise<string[]> {
        restore();
        return [];
      };
      return restore;
    },
    /** Wait until the requested seat's production Main controller is authoritatively open. */
    async waitForMainPhase(seat: Seat): Promise<void> {
      // Poll on MICROTASKS. Production opens Main, runs its start-of-main timing and can
      // auto-end the phase without ever yielding to a timer, so the open-and-idle window is
      // only a few microtasks wide; a macrotask yield drains every pending microtask at once
      // and steps straight over it. Yield a real timer only once the engine has genuinely
      // stopped progressing, so engine work that does need a timer is not starved either.
      // Ready means the engine would ACCEPT a main verb: entry is finalized (`mainEntryPending`
      // cleared, nothing resolving), or a start-of-main effect is parked on a decision that
      // only this caller's test can answer. Requiring finalized entry alone would deadlock
      // those turns; ignoring `mainEntryPending` returns in the microtask gap between Main
      // opening and its start-of-main timing starting, and the caller's first verb is then
      // refused as `wrong-phase`. A decision counts only once it has sat unanswered across
      // many polls, so one the harness auto-responder answers a microtask later is not
      // mistaken for input the test must supply.
      // A seat with no legal main action is auto-passed by the entry finalizer itself, so its
      // Main is never open AND finalized; that turn counts as ready the moment its Main has
      // been observed open and then closed again (`endMainPhaseIfOpen` tolerates the auto-end).
      // Polling every microtask observes that window because the turn loop never parks on a
      // timer between phases.
      let signature = "";
      let stalled = 0;
      let observedOpen = false;
      const inMain = () => internals.mainPhase.seat === seat && internals.state.phase === Phase.Main;
      const idle = () =>
        !internals.mainEntryPending &&
        internals.activeWindowToken === undefined &&
        internals.effectResolutionDepth === 0 &&
        internals.optionResolutionDepth === 0;
      // A block or counter window is input too: a start-of-main attack parks its resolution
      // on the defending seat's `declareBlock` / `declineBlock` intent, not on a decision.
      const awaitingInput = () =>
        internals.state.pendingDecision !== undefined ||
        internals.combat.hasOpenBlockWindow ||
        internals.combat.hasOpenCounterWindow;
      const awaitingTestInput = () => awaitingInput() && stalled >= 50;
      const ready = () => {
        if (!inMain()) return observedOpen;
        observedOpen = true;
        return idle() || awaitingTestInput();
      };
      // The stall count must describe the state `ready()` is about to judge: a decision that
      // opened this tick resets it, so the count carried over from the engine's previous quiet
      // stretch cannot pass a decision the harness auto-responder answers a microtask later.
      for (let i = 0; i < 20000; i += 1) {
        const next = `${internals.state.phase}/${internals.mainPhase.seat}/${internals.mainEntryPending}/${internals.activeWindowToken}/${internals.effectResolutionDepth}/${internals.optionResolutionDepth}/${internals.state.pendingDecision?.decisionId}/${internals.combat.hasOpenBlockWindow}/${internals.combat.hasOpenCounterWindow}`;
        if (next === signature) stalled += 1;
        else {
          signature = next;
          stalled = 0;
        }
        if (ready()) break;
        if (stalled >= 200) {
          stalled = 0;
          await new Promise((resolve) => setTimeout(resolve, 0));
        } else await Promise.resolve();
      }
      if (!ready()) {
        throw new Error(
          `Seat ${seat}'s Main phase did not become ready (phase/seat/entryPending/window/effectDepth/optionDepth/decision/blockWindow/counterWindow = ${signature})`,
        );
      }
      // TurnStateMachine deliberately opens Main before its asynchronous start-of-main
      // timing finishes. Wait through any in-flight continuous rebuild so a caller that
      // observes the phase also sees the persistent effects for the new turn.
      await internals.recomputeContinuousEffects();
    },

    /** End the requested seat's Main phase when it is still open; tolerate production auto-end. */
    endMainPhaseIfOpen(seat: Seat): void {
      if (internals.mainPhase.seat !== seat || internals.state.phase !== Phase.Main) return;
      const ended = engine.applyIntent(seat, { type: "endPhase" });
      if (!ended.ok) {
        throw new Error(`Could not end seat ${seat}'s Main phase: ${ended.reason}`);
      }
    },

    /**
     * Drive one complete production turn and voluntarily end its Main phase.
     * The caller arranges `turnSeat`/memory before entry when chaining hand-laid turns.
     */
    async runTurn(seat: Seat): Promise<void> {
      if (internals.state.turnSeat !== seat) {
        throw new Error(`Cannot run seat ${seat}'s turn while seat ${internals.state.turnSeat} is active`);
      }

      const turn = engine.runOneTurn();
      await this.waitForMainPhase(seat);

      this.endMainPhaseIfOpen(seat);
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
      await internals.fireTimingForPermanent(timing, permanent);
      await internals.recomputeContinuousEffects();
    },

    /** Fire a production-wide timing window, including its rule-processing follow-ups. */
    async fireGlobal(timing: EffectTiming, trigger: TriggerInfo = {}): Promise<void> {
      await internals.fireTiming(timing, trigger);
    },

    /** Fire one permanent's timing with an explicit production trigger payload. */
    async fireForPermanent(timing: EffectTiming, permanent: Permanent, trigger: TriggerInfo = {}): Promise<void> {
      await internals.recomputeContinuousEffects();
      await internals.fireTimingForPermanent(timing, permanent, trigger);
      await internals.recomputeContinuousEffects();
    },

    /** Fire a timing window on a loose card instance (security, hand, trash). */
    async fireForInstance(timing: EffectTiming, instance: CardInstance, trigger: TriggerInfo = {}): Promise<void> {
      // A security skill resolves while its source is revealed face up. Board specs store
      // security face down by default, so the direct timing seam must model that production
      // reveal before the engine collects the requested instance.
      if (timing === EffectTiming.SecuritySkill) instance.faceUp = true;
      await internals.recomputeContinuousEffects();
      await internals.fireTimingForInstance(timing, instance.instanceId, trigger);
      await internals.recomputeContinuousEffects();
    },

    /** Fire a named future-event watcher through the production SubTrigger bus. */
    async fireSubTrigger(event: SubTriggerEventName, payload: TriggerInfo = {}): Promise<void> {
      await internals.recomputeContinuousEffects();
      await internals.fireSubTrigger(event, payload);
      await internals.recomputeContinuousEffects();
    },

    /**
     * Fire the SubTrigger bus WITHOUT the leading continuous recompute.
     *
     * `fireSubTrigger` brackets the fire with recomputes, which is right when the watcher under
     * test is one a resident clause re-derives every pass. It is wrong for asserting what
     * happens to an ALREADY-ARMED watcher when the board moves under it: the leading recompute
     * tears every continuous subscription down and re-derives it from the new board, which
     * erases the exact transition CR §15-4-4-3 is about. Production reaches this state whenever
     * one event arms several watchers and an earlier one's body changes the board — no
     * recompute runs between them.
     */
    async fireArmedSubTriggers(event: SubTriggerEventName, payload: TriggerInfo = {}): Promise<void> {
      await internals.fireSubTrigger(event, payload);
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
      /**
       * Open the resolution-source window a real effect resolution runs inside, so
       * opponent-scoped and source-kind-qualified restrictions see the same context they
       * would mid-resolution. Pair every call with `leaveEffectResolution`.
       */
      enterEffectResolution(seat: Seat, sourceKinds?: string[], sourcePermanentId?: string): void {
        internals.primitives.enterEffectResolution?.(seat, sourceKinds, sourcePermanentId);
      },
      /** Close the window opened by `enterEffectResolution`. */
      leaveEffectResolution(): void {
        internals.primitives.leaveEffectResolution?.();
      },
      /**
       * Grant a continuous restriction through the production primitive (the verb every
       * `Restrict` / `GrantStatic` immunity clause compiles to), so its own side effects — the
       * DP recompute a `beAffected` grant performs (KB Q5327) — run exactly as they do in a
       * real resolution. Writing to the continuous ledger directly skips them.
       */
      async restrict(
        permanentId: string,
        restriction: Parameters<Primitives["restrict"]>[1],
        duration: EffectDuration,
        opts?: Parameters<Primitives["restrict"]>[3],
      ): Promise<void> {
        internals.primitives.restrict(permanentId, restriction, duration, opts);
        await internals.recomputeContinuousEffects();
      },
      /**
       * Arm the delayed end-of-turn memory change through the production primitive. Every card
       * that prints this clause says "at the end of YOUR turn", so no legal line puts one
       * player's tail into the other player's turn end — the board KB Q5566/Q5568 describe for
       * pending processing. This verb builds it directly.
       */
      delayedGainMemory(seat: Seat, amount: number): void {
        internals.primitives.delayedGainMemory?.(seat, amount);
      },
      /** Effect-driven deletion. Returns how many permanents were actually removed. */
      async deletePermanent(permanentIds: string[], cause?: RemovalCause): Promise<number> {
        await internals.recomputeContinuousEffects();
        const removed = await internals.primitives.deletePermanent(permanentIds, cause);
        await internals.recomputeContinuousEffects();
        return removed;
      },
      /**
       * Grant ＜Link +N＞ headroom through the production primitive (`fx.grantLinkMax`, the verb
       * every ＜Link +N＞ clause compiles to). Board Specs can seed link cards but nothing in the
       * public intent surface raises a Digimon's link maximum, so a test proving link-cap
       * behaviour needs this affordance rather than a reach-through to `continuous`.
       */
      async grantLinkMax(permanentId: string, delta: number, duration: EffectDuration): Promise<void> {
        await internals.recomputeContinuousEffects();
        internals.primitives.grantLinkMax(permanentId, delta, duration);
        await internals.recomputeContinuousEffects();
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
      /** Draw through the effect primitive, including effect-driven hand-add watchers. */
      async drawByEffect(seat: Seat, count: number): Promise<CardInstance[]> {
        await internals.recomputeContinuousEffects();
        return internals.primitives.draw(seat, count);
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
      /** Exercise the dedicated security-origin play route, including its entry windows. */
      async playFromSecurity(instanceId: string): Promise<void> {
        await internals.primitives.playFromSecurity(instanceId);
        await internals.recomputeContinuousEffects();
      },

      async playInstances(
        instanceIds: string[],
        effectSourceCardId?: string,
        opts?: { breeding?: boolean },
      ): Promise<void> {
        await internals.recomputeContinuousEffects();
        await internals.primitives.playInstances(instanceIds, {
          payCost: false,
          ...(opts?.breeding === true ? { breeding: true } : {}),
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
      /** App Fuse through the production primitive when no player intent exposes the procedure. */
      async appFuseInto(permanentId: string, instanceId: string): Promise<Permanent | undefined> {
        await internals.recomputeContinuousEffects();
        const result = await internals.primitives.appFuseInto(permanentId, instanceId);
        await internals.recomputeContinuousEffects();
        return result;
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
