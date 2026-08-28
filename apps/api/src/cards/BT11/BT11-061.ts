// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  { tokens: ["Snatchmon", "Destromon", "Galacticmon"], match: "name" },
                  { tokens: ["Fusionize"], match: "name" },
                ],
              },
              count: 1,
              to: "hand",
              upTo: true,
            },
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }] },
              count: 1,
              to: "placeUnder",
            },
          ],
          rest: "deckBottom",
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "By suspending this Digimon",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["Destromon", "Galacticmon"], match: "name" }],
          },
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-061", compiled);
