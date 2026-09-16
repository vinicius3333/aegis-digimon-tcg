import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: {
            keyword: "Unblockable",
          },
          duration: "forTheTurn",
        },
        {
          kind: "GrantStatic",
          target: {
            filter: {
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Knightmon", "Knightsmon"],
                  match: "name",
                },
              ],
            },
            count: "all",
          },
          grant: {
            keyword: "Unblockable",
          },
          duration: "forTheTurn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-042", compiled);
