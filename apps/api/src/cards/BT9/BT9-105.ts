import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealChooseDeleteBudget",
          revealCount: 3,
          revealController: "mine",
          chooseFilter: {
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["X Antibody"],
                match: "trait",
              },
            ],
          },
          deleteFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          deleteCount: 1,
          returnRevealed: "trash",
        },
        {
          effectTextPart:
            "Then, place 1 card with [X Antibody] in its traits from your trash under 1 of your Digimon with [X Antibody] in its traits as its bottom digivolution card.",
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["X Antibody"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            from: ["trash"],
          },
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["X Antibody"],
                match: "trait",
              },
            ],
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

registerIrCard("BT9-105", compiled);
