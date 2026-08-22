import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
              cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
              optional: true,
            },
          ],
          raw: "When one of your opponent's level 5 or lower Digimon is deleted, you may suspend this Tamer to draw 1",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenMovedFromBreeding",
          sourceFilter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "eq", value: 3 } },
          actions: [{ kind: "GainMemory", amount: 2 }],
          raw: "When one of your opponent's level 3 Digimon is moved from their breeding area to their battle area, gain 2 memory",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-094", compiled);
export { compiled };
export default compiled;
