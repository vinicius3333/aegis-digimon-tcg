import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], lowestLevel: true }, count: "all" } }],
      condition: { kind: "raw", raw: "this Digimon has [Dorugoramon] in its digivolution cards or digivolved from the trash" },
    },
    {
      trigger: "OnDeletion",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { controller: "mine", kind: ["Digimon"], levels: [3], colors: ["Purple", "Black"] }, count: 1 }, from: ["trash"], payCost: false, optional: true },
        { kind: "PlayWithoutCost", target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["DeathXmon"], match: "name" }] }, count: 1 }, from: ["trash"], payCost: false, optional: true },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-081", compiled);
