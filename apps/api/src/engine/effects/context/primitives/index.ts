export type { BoardPrimitives } from "./board.js";
export type { CombatPrimitives } from "./combat.js";
export type { ContinuousPrimitives } from "./continuous.js";
export type { DeckPrimitives } from "./deck.js";
export type { DelayedPrimitives } from "./delayed.js";
export type { RemovalPrimitives } from "./removal.js";
export type { ResourcePrimitives } from "./resources.js";
export type { SecurityPrimitives } from "./security.js";

import type { BoardPrimitives } from "./board.js";
import type { CombatPrimitives } from "./combat.js";
import type { ContinuousPrimitives } from "./continuous.js";
import type { DeckPrimitives } from "./deck.js";
import type { DelayedPrimitives } from "./delayed.js";
import type { RemovalPrimitives } from "./removal.js";
import type { ResourcePrimitives } from "./resources.js";
import type { SecurityPrimitives } from "./security.js";

/**
 * The effect verbs (card-module contract). Each is the direct analogue of an
 * source the effect runtime / the effect factory operation; each mutates
 * authoritative state and emits the right events.
 *
 * Implemented by `createPrimitives` in `engine/effects/primitives.ts`, wired into
 * GameEngine. Signatures below are the contract card modules are written against.
 *
 * The verbs are grouped one file per subject; this is the whole set, and the
 * only name the implementation and the card modules use.
 */
export interface Primitives
  extends
    ResourcePrimitives,
    BoardPrimitives,
    RemovalPrimitives,
    DeckPrimitives,
    ContinuousPrimitives,
    SecurityPrimitives,
    CombatPrimitives,
    DelayedPrimitives {}
