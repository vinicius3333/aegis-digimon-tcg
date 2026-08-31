// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const watchedTraits = [
  { tokens: ["Vegetation"], match: "trait" },
  { tokens: ["Fairy"], match: "trait" },
  { tokens: ["WG"], match: "trait" },
];

export const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 2, traits: ["WG"], cost: 0, isAlternate: true }],
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: watchedTraits, excludeSelf: true },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true }, count: 1 },
              from: ["hand"],
              into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: watchedTraits },
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
    },
    { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-024", compiled);
