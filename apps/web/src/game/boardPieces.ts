/* Board sub-components — piles, permanents, breeding slot, memory gauge, hand,
   attack arrow. Presentational; they read real Permanent / count data and take
   interaction handlers (click / drop zones / pointer-drag) as props.

   Each piece now has its own file under ./piece, with the geometry and label
   maths beside them as pure functions. This file is the entry point they are
   still imported through. */

export { HAND_CARD_WIDTH, HAND_CARD_WIDTH_COMPACT, HAND_MIN_EXPOSURE_TOUCH } from "./piece/constants";
export type { ArrowPoint, DropAttrs, HandEntry, HandSelection, ScrollOverflow } from "./piece/types";

export { buildShieldShards } from "./piece/shieldShards";
export { handOverlap } from "./piece/handLayout";
export { formatDpDelta } from "./piece/formatDpDelta";
export { MEMORY_SWEEP_CHIP_MS, MEMORY_SWEEP_MS, traversedChips } from "./piece/memoryChips";
export { useElementWidth } from "./piece/useElementWidth";
export { useScrollOverflow } from "./piece/useScrollOverflow";

export { AttackArrow } from "./piece/AttackArrow";
export { BoardInputLock } from "./piece/BoardInputLock";
export { BreedingSlot } from "./piece/BreedingSlot";
export { ClawSlash } from "./piece/ClawSlash";
export { DpPulseParticles } from "./piece/DpPulseParticles";
export { Hand } from "./piece/Hand";
export { MemoryArc } from "./piece/MemoryArc";
export { MemoryGauge } from "./piece/MemoryGauge";
export { MemoryPredictionArc } from "./piece/MemoryPredictionArc";
export { PermanentView } from "./piece/PermanentView";
export { Pile } from "./piece/Pile";
export { TurnControl } from "./piece/TurnControl";
