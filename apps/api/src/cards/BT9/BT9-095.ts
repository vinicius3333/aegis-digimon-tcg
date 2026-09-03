import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q1898-Q1901: the reducer requires the exact [X Antibody] card name; the
// optional Greymon attack must be legal, targets only the player, and runs the
// ordinary attack lifecycle (including [When Attacking] effects).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { controllerDefault: "mine" },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 2,
              condition: {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  digivolutionStackNameOrTrait: [{ tokens: ["X Antibody"], match: "nameExact" }],
                },
                raw: "you have a Digimon with [X Antibody] in its digivolution cards in play",
              },
              raw: "reduce the memory cost of this card by 2",
            },
          ],
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 13000 } }, count: 1 },
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Greymon"], match: "name" }],
            },
            count: 1,
          },
          attackPlayer: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-095", compiled);
