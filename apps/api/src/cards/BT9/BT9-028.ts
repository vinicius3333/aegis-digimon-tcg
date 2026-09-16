import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] Unsuspend this Digimon.",
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
        },
        {
          effectTextPart:
            "Then, if [WereGarurumon] or [X Antibody] is in this Digimon’s digivolution cards, return 1 of your opponent’s level 4 or lower Digimon to its owner’s hand.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          to: "hand",
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["WereGarurumon", "X Antibody"],
                  match: "nameExact",
                },
              ],
            },
            raw: "[WereGarurumon] or [X Antibody] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["WereGarurumon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT9-028", compiled);
