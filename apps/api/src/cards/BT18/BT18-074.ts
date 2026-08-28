// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                colors: ["Black"],
                kind: ["Digimon", "Tamer"],
                playCostLte: 7,
              },
              count: 1,
              to: "play",
            },
          ],
          rest: "trash",
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                colors: ["Black"],
                kind: ["Digimon", "Tamer"],
                playCostLte: 7,
              },
              count: 1,
              to: "play",
            },
          ],
          rest: "trash",
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          optional: true,
          actions: [
            {
              kind: "Modal",
              choose: 1,
              labels: ["Return this Digimon to your hand", "Play a level 4 or lower black Digimon"],
              options: [
                [
                  {
                    kind: "Return",
                    target: {
                      filter: {
                        isSelfRef: true,
                      },
                      count: 1,
                      isSelf: true,
                    },
                    to: "hand",
                  },
                ],
                [
                  {
                    kind: "PlayWithoutCost",
                    target: {
                      filter: {
                        levelComparison: {
                          op: "lte",
                          value: 4,
                        },
                        colors: ["Black"],
                        kind: ["Digimon"],
                      },
                      count: 1,
                    },
                    fromOwnDigivolutionStack: true,
                    payCost: false,
                  },
                ],
              ],
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["Mercurymon"],
        },
        {
          names: ["Sephirothmon"],
        },
      ],
      count: 2,
    },
  ],
};

registerIrCard("BT18-074", compiled);
