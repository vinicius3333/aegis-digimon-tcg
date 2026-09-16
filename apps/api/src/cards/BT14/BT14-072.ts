import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play][When Attacking] Return 1 purple Digimon card with the [Dark Animal] trait from your trash to the hand.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Purple"],
              nameOrTrait: [
                {
                  tokens: ["Dark Animal"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          effectTextPart:
            "[On Play][When Attacking] Return 1 purple Digimon card with the [Dark Animal] trait from your trash to the hand.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Purple"],
              nameOrTrait: [
                {
                  tokens: ["Dark Animal"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-072", compiled);
