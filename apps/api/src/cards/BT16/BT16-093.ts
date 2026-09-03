import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
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
              colors: ["Green"],
            },
            raw: "you have a green Digimon",
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
              nameOrTrait: [
                {
                  tokens: ["Gargomon", "Rapidmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Rapidmon"],
                match: "name",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          ignoreRequirements: true,
          optional: true,
          bindResultAs: "bt16093Rapidmon",
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              boundRef: "bt16093Rapidmon",
            },
            count: 1,
          },
          restriction: "dpImmune",
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levels: [3],
              nameOrTrait: [
                {
                  tokens: ["Terriermon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
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

registerIrCard("BT16-093", compiled);
export { compiled };
