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
          revealCount: 4,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Lucemon"],
                    match: "name",
                  },
                  {
                    tokens: ["Royal Knight"],
                    match: "trait",
                  },
                ],
              },
              count: 2,
              to: "hand",
            },
          ],
          rest: "trash",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Lucemon"],
                    match: "name",
                  },
                  {
                    tokens: ["Royal Knight"],
                    match: "trait",
                  },
                ],
              },
              count: 2,
              to: "hand",
            },
          ],
          rest: "trash",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Lucemon"],
                match: "name",
              },
              {
                tokens: ["Royal Knight"],
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
                  levelComparison: {
                    op: "lte",
                    value: 4,
                  },
                },
                count: "all",
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-087", compiled);
