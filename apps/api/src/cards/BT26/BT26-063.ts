// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const linkedSelf = { isSelfRef: true };

export const compiled: CompiledCard = {
  keywords: [{ keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" }],
  effects: [
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: linkedSelf,
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [
                {
                  filter: {
                    controllerDefault: "mine",
                    nameOrTrait: [
                      { tokens: ["Entertainment"], match: "trait" },
                      { tokens: ["Open"], match: "trait" },
                      { tokens: ["Seven Code"], match: "trait" },
                    ],
                  },
                  count: 1,
                },
              ],
              rest: "deckTopOrBottom",
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: linkedSelf,
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" },
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }],
  linkRequirement: [{ traits: ["Appmon"], cost: 3 }],
};

registerIrCard("BT26-063", compiled);
