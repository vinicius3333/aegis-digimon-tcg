import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT9-106 DeathXDigivolution! — Option card
// [Static] While you have a Digimon with [X Antibody] in its traits in play,
//           you may use this card without meeting its color requirements.
// [Main]   Digivolve 1 of your Digimon into a Digimon card with [Dex] or [DeathX]
//           in its name from your trash for its memory cost.
//           (KB Q1913: digivolution requirements still apply; Q1914: cost reductions apply.)
// [Security] Add this card to its owner's hand.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["X Antibody"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a Digimon with [X Antibody] in its traits in play",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Dex"],
                match: "name",
              },
              {
                tokens: ["DeathX"],
                match: "name",
              },
            ],
          },
          from: ["trash"],
          payCost: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-106", compiled);
