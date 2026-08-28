import type { GameEngine } from "../GameEngine.js";
import type { ContinuousEffectLedger } from "../effects/continuous.js";
import type { ModifierLedger } from "../effects/primitives.js";
import type { SubTriggerRegistry } from "../effects/subtriggers.js";
import type { UseTracker } from "../effects/kernel.js";
import type { CombatController } from "../combat/controller.js";
import type { MainPhaseController } from "../MainPhaseController.js";
import type { Primitives, SubTriggerEventName, TriggerInfo } from "../effects/EffectContext.js";
import type { SecurityDpLedger } from "../security/securityDp.js";
import type { CardSource } from "../effects/CardSource.js";
import type { CardInstance, EffectTiming, GameState, Permanent, Seat } from "@aegis/shared";

/**
 * The Test Seam's one reach-through. `GameEngine`'s collaborators are private: callers
 * drive them through intents, and this is the only module permitted to see past that.
 * Every other test observes through the harness's named affordances.
 *
 * Enforced by `testkitSeam.guard.test.ts`: an engine cast anywhere outside this directory
 * fails the build. Widening `EngineInternals` is a deliberate act — it is the Test Seam's
 * dependency on engine structure, and everything it exposes must be re-exposed as a named
 * affordance on the harness rather than handed to tests raw.
 */
export interface EngineInternals {
  readonly state: GameState;
  readonly continuous: ContinuousEffectLedger;
  readonly modifiers: ModifierLedger;
  readonly subTriggers: SubTriggerRegistry;
  readonly tracker: UseTracker;
  readonly combat: CombatController;
  readonly mainPhase: MainPhaseController;
  readonly primitives: Primitives;
  readonly securityDp: SecurityDpLedger;
  recomputeContinuousEffects(): Promise<void>;
  syncActivatableEffects(): void;
  fireTiming(timing: EffectTiming, trigger?: TriggerInfo): Promise<void>;
  fireTimingForPermanent(timing: EffectTiming, permanent: Permanent, trigger?: TriggerInfo): Promise<void>;
  fireTimingForInstance(timing: EffectTiming, instanceId: string, trigger?: TriggerInfo): Promise<void>;
  fireSubTrigger(event: SubTriggerEventName, payload?: TriggerInfo): Promise<void>;
  cardSourceOf(instance: CardInstance): CardSource;
  drawCards(seat: Seat, count: number): Promise<CardInstance[]>;
  beginResolvingWindow(): boolean;
  endResolvingWindow(wasOutermost: boolean): void;
}

export function internalsOf(engine: GameEngine): EngineInternals {
  return engine as unknown as EngineInternals;
}
