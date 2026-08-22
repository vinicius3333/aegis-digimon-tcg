// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [{
    trigger: "YourTurn",
    frequency: "OncePerTurn",
    isInherited: true,
    actions: [{
      kind: "SubTrigger",
      event: "whenEffectAddsToDeck",
      actions: [{
        kind: "Digivolve",
        target: { filter: { isSelfRef: true }, count: 1 },
        from: ["hand"],
        into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Chronomon"], match: "text" }] },
        payCost: true,
        costDelta: -1,
        optional: true,
      }],
    }],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-001", compiled);
