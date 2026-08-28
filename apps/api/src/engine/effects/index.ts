// Effect framework (subsystem: effect-framework). The per-card EffectModule
// contract, the timing builders, the registry, the canTrigger/canActivate kernel
// (with per-turn use limits), trigger collection, and the runtime-context
// plumbing. Every implemented card module plugs in here (card-module contract).

export type { EffectModule } from "./EffectModule.js";
export type { Effect } from "./Effect.js";
export type { CardSource } from "./CardSource.js";
export type {
  EffectContext,
  TriggerInfo,
  GameAccess,
  Primitives,
  DecisionApi,
  Restriction,
  SubTriggerEventName,
  ReplacementEventName,
  SubTriggerInstall,
  ReplacementInstall,
} from "./EffectContext.js";
export * from "./builders.js";
export { registerCard, getEffectModule, registeredCardCount } from "./registry.js";

// Kernel: cross-cutting guards + per-turn use tracking (ICardEffect base class).
export { UseTracker, isOverMaxPerTurn, passesPlacementGuard, canTrigger, canActivate, canUse } from "./kernel.js";

// Collection: query registered modules for the effects that fire at a timing.
export { effectsOf, collectTriggeredEffects } from "./collect.js";
export type { CollectedEffect } from "./collect.js";

// Context plumbing: bind the runtime EffectContext / GameAccess / CardSource lookup
// to authoritative GameState.
export {
  createGameAccess,
  createEffectContext,
  createCardStateLookup,
  unimplementedPrimitives,
  unimplementedDecisions,
  gatherTriggeredEffects,
} from "./context.js";
export type { EffectEnvironment } from "./context.js";

// Effect primitives (subsystem: effect-primitives) — the concrete `fx` verbs card
// modules call, bound to the engine via a narrow PrimitivesEngine port.
// `createPrimitives` is the real implementation behind the `unimplementedPrimitives()`
// placeholder in context.ts; the engine swaps it in when building a resolution context.
export { createPrimitives } from "./primitives.js";
export type { PrimitivesEngine, MemoryPort, SelectionPort } from "./primitives.js";
export { ModifierLedger } from "./modifiers.js";
export type { DpModifier, PierceGrant, EvoCostAdjustment, DurationBoundary } from "./modifiers.js";

// Continuous-effect application layer (subsystem: static-continuous-effects) — the
// server-only store of "can't ..." restrictions, name/trait aliases, and color-cost
// waivers, read at combat/turn/cost decision points.
export { ContinuousEffectLedger } from "./continuous.js";

// Sub-trigger / delayed-effect + replacement registry (subsystem:
// delayed-and-rule-effects) — installs "When X, <effect>" and "When this would Y,
// <replacement>" subscriptions the engine fires/consults at the matching event.
export { SubTriggerRegistry } from "./subtriggers.js";
export type { SubTriggerSubscription, ReplacementSubscription } from "./subtriggers.js";

// Stack resolution (subsystem: effect-stack-resolution) — ordered, interruptible
// resolution: collect -> order turn-player-first -> prompt optional/order ->
// resolve one-at-a-time -> rescan for effects triggered during resolution
// (documented behavior + documented behavior). `resolveTiming` runs a timing window
// against a ResolutionEnv the engine binds; `orderTurnPlayerFirst` is the pure
// ordering helper.
export { resolveTiming, orderTurnPlayerFirst } from "./stack.js";
export type { ResolutionEnv } from "./stack.js";
// Composition root: bind the resolver to the framework collection chain + engine
// state. `runTiming` is the one call GameEngine.fireTiming delegates to.
export { buildResolutionEnv, runTiming } from "./resolution.js";
export type { ResolutionDeps } from "./resolution.js";
