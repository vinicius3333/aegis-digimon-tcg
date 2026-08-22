// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "StartOfYourTurn", actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2, controller: "mine" } }] },
    {
      trigger: "YourTurn",
      actions: [{ kind: "SubTrigger", event: "whenAttacking", sourceFilter: { controller: "mine", kind: ["Digimon"] }, actions: [{
        kind: "RedirectAttack",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        includePlayer: true,
        cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, raw: "by suspending this Tamer" },
        optional: true,
        abortOnDecline: true,
      }] }],
    },
    { trigger: "Security", actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST18-14", compiled);
export { compiled };
