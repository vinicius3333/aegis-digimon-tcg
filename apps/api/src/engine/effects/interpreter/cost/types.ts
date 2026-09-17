import type { EffectContext } from "../../EffectContext.js";
import type { Cost } from "@aegis/shared";

/** How every cost kind is paid: true when the cost was met in full. */
export type CostPayer = (
  ctx: EffectContext,
  cost: Cost,
  out?: { paidCount: number },
  opts?: { deferSuspendTriggers?: boolean },
) => Promise<boolean>;
