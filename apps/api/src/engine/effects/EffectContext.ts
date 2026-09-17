/**
 * The card-module contract: what an effect receives at runtime and every verb it
 * can call. The types live in `context/`, one file per subject; this barrel is
 * the single name the ~180 call sites import from.
 */
export type { EffectContext } from "./context/effectContext.js";
export type { DecisionApi, SeatScopedDecisionApi } from "./context/decisions.js";
export type { GameAccess } from "./context/gameAccess.js";
export type { Primitives } from "./context/primitives/index.js";
export type {
  ReplacementEventName,
  ReplacementInstall,
  ReplacementInstallBase,
  ReplacementInstallDnaMemory,
  ReplacementInstallInstead,
  ReplacementInstallPrevent,
  ReplacementInstallRedirect,
  ReplacementInstallReduceCost,
} from "./context/replacements.js";
export type { DeprecatedRestriction, EnforcedRestriction, Restriction } from "./context/restrictions.js";
export type { SubTriggerEventName, SubTriggerInstall, SubTriggerSourceScope } from "./context/subTriggers.js";
export type { DiscardedStackSourceProof, RemovalCause, TriggerInfo } from "./context/triggers.js";
