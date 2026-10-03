import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] If you have a Digimon with [Dorugoramon] in its name, delete 1 of your opponent's Digimon or Tamers with a play cost of 4 or less.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              playCostLte: 4,
            },
            count: 1,
          },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dorugoramon"],
                  match: "name",
                },
              ],
            },
            raw: "you have a Digimon with [Dorugoramon] in its name",
          },
        },
        {
          effectTextPart: "Then, delete all of your opponent's Digimon with the lowest play cost.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestPlayCost",
            },
            count: "all",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT16-098", compiled);
export { compiled };
