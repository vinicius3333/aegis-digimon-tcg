import type { Seat } from "../schema/enums.js";
import type { EffectQueueZone } from "#shared/protocol/EffectQueueZone";

export interface EffectQueueEntry {
  seat: Seat;
  position: number;
  lastPosition?: number;
  isResolving?: true;
  sourceCardId?: string;
  sourcePermanentId?: string;
  timing?: string;
  isInherited?: true;
  sourceZone?: EffectQueueZone;
}
