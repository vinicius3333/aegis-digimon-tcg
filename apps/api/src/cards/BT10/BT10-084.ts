import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
            },
            count: 2,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
          bindResultAs: "playedBagra",
        },
        {
          kind: "GainKeyword",
          target: { filter: { boundRef: "playedBagra", controller: "mine", kind: ["Digimon"] }, count: "all" },
          keyword: { keyword: "Blocker" },
          duration: "untilOpponentTurnEnd",
          condition: { kind: "ifThisEffectActed" },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldTrashDigivolutionCard",
          raw: "[Opponent's Turn] When an effect would trash one of your other Digimon's digivolution cards, you may trash this Digimon's digivolution cards instead.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };
registerIrCard("BT10-084", compiled);
