// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{ trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "onDeletionOf", sourceFilter: { controllerDefault: "opponent", kind: ["Digimon"], deleteCause: "dpReachedZero" }, actions: [{ kind: "GainMemory", amount: 1 }], raw: "When an opposing Digimon is deleted by dropping to 0 DP, gain 1 memory." }], isInherited: true, frequency: "OncePerTurn" }],
  coverage: "full",
  residual: [],
};

registerIrCard("ST3-04", compiled);
export { compiled };
