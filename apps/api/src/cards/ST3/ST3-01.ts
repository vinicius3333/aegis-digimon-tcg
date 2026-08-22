// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{ trigger: "YourTurn", actions: [{ kind: "SubTrigger", event: "onDeletionOf", sourceFilter: { controller: "opponent", kind: ["Digimon"], deleteCause: "dpReachedZero" }, actions: [{ kind: "ModifyDP", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, amount: 1000, duration: "forTheTurn" }], raw: "When an opposing Digimon is deleted by dropping to 0 DP, this Digimon gets +1000 DP for the turn." }], isInherited: true, frequency: "OncePerTurn" }],
  coverage: "full",
  residual: [],
};

registerIrCard("ST3-01", compiled);
export { compiled };
