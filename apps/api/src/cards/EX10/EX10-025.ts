// @ts-nocheck
// HAND-FIXED IR for EX10-025 — do not regenerate.
// whenTrashedFromDigivolutionCards: added sourceFilter for [Mineral]/[Rock] trait.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              nameOrTrait: [
                {
                  tokens: ["Mineral", "Rock"],
                  match: "trait",
                },
              ],
            },
          },
          from: ["trash"],
          count: 2,
          underFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Mineral", "Rock"],
                match: "trait",
              },
            ],
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardDiscarded",
          sourceFilter: {
            nameOrTrait: [
              {
                tokens: ["Mineral", "Rock"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  playCostLte: 4,
                },
                count: 1,
              },
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX10-025", compiled);
