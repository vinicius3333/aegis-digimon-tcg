// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", actions: [{ kind: "Link", target: { filter: { controller: "mine", kind: ["Digimon"], levels: [3] }, count: 1 }, payCost: false, optional: true }], frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" },
    { trigger: "WhenAttacking", actions: [{ kind: "Link", target: { filter: { controller: "mine", kind: ["Digimon"], levels: [3] }, count: 1 }, payCost: false, optional: true }], frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" },
    {
      trigger: "YourTurn",
      actions: [{ kind: "SubTrigger", event: "whenLinked", actions: [{ kind: "Restrict", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, restriction: "beDeletedInBattle", duration: "untilOpponentTurnEnd" }] }],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  appFusionRequirement: [{ names: ["Dokamon", "Perorimon", "Musclemon"], cost: 0 }],
};

registerIrCard("BT23-021", compiled);
export { compiled };
