import { type Seat } from "@aegis/shared";
import type { Primitives } from "../EffectContext.js";

import type { PrimitivesContext } from "./context.js";

/**
 * The verbs that are a single pass to the engine or a ledger. They were written
 * inline in the returned object rather than as named closures, and stay that way;
 * the Pick is what gives their parameters types, as the object literal used to.
 */

export function createEngineBackedVerbs(
  pc: PrimitivesContext,
): Pick<
  Primitives,
  | "setTurnEndMinMemory"
  | "linkCostReductionUsed"
  | "markLinkCostReductionUsed"
  | "customEffectGrants"
  | "prepareDigiXrosPlay"
  | "prepareDigiXrosPlays"
> {
  const { engine, access, continuous } = pc;

  return {
    setTurnEndMinMemory: (seat: Seat, minimum: number) => engine.memory.setTurnEndMinMemory?.(seat, minimum),
    linkCostReductionUsed: (key) => engine.barrierFired?.(`link-cost/${key}`) ?? false,
    markLinkCostReductionUsed: (key) => engine.markBarrierFired?.(`link-cost/${key}`),
    customEffectGrants: (permanentId) =>
      continuous
        .listCustomEffectGrants()
        .filter(
          (grant) =>
            grant.instanceId === access.permanentById(permanentId)?.topCard?.instanceId && grant.isActive?.() !== false,
        ),
    prepareDigiXrosPlay: async (instanceId) => engine.prepareDigiXrosPlay?.(instanceId) ?? [],
    prepareDigiXrosPlays: async (instanceIds) => {
      if (engine.prepareDigiXrosPlays !== undefined) return engine.prepareDigiXrosPlays(instanceIds);
      const prepared: Record<string, string[]> = {};
      for (const instanceId of instanceIds)
        prepared[instanceId] = (await engine.prepareDigiXrosPlay?.(instanceId)) ?? [];
      return prepared;
    },
  };
}
