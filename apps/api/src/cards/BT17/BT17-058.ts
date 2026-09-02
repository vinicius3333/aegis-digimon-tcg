import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
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
                kind: ["Digimon"],
                colors: ["Black"],
                levelComparison: {
                  op: "lte",
                  value: 5,
                },
              },
              count: 1,
              to: "placeUnder",
              underFilter: {
                isSelfRef: true,
              },
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
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Black"],
                levelComparison: {
                  op: "lte",
                  value: 5,
                },
              },
              count: 1,
              to: "placeUnder",
              underFilter: {
                isSelfRef: true,
              },
            },
          ],
          rest: "trash",
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["Machine"],
                  match: "trait",
                },
              ],
              zone: "digivolutionCards",
              hostFilter: {
                isSelfRef: true,
              },
            },
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-058", compiled);
