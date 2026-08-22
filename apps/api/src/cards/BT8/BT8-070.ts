import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "DeleteByStackColorBudget",
          redFilter: { controller: "opponent", kind: ["Digimon"] },
          blackFilter: { controller: "opponent", kind: ["Tamer"] },
          budget: 6,
          raw: "If this Digimon has a red digivolution card, choose any number of your opponent's Digimon. If this Digimon has a black digivolution card, choose any number of your opponent's Tamers. The chosen cards' play costs must add up to 6 or less. Delete the chosen cards.",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            { kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-070", compiled);
export { compiled };
export default compiled;
