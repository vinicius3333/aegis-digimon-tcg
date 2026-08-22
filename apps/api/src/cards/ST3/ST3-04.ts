// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{ trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "onDeletionOf", sourceFilter: { controller: "opponent", kind: ["Digimon"] }, fireCondition: { kind: "triggerDeletedByDpZero" }, actions: [{ kind: "GainMemory", amount: 1 }], raw: "When an opposing Digimon is deleted by dropping to 0 DP, gain 1 memory." }], isInherited: true, frequency: "OncePerTurn" }],
  coverage: "full",
  residual: [],
};

registerIrCard("ST3-04", compiled);
export { compiled };
