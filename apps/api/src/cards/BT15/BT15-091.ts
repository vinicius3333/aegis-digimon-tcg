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
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Matt Ishida"],
                  match: "name",
                },
              ],
            },
            raw: "you have a Tamer with [Matt Ishida] in its name",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "compound",
            costs: [
              {
                kind: "place",
                target: {
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    nameOrTrait: [
                      {
                        tokens: ["Garurumon"],
                        match: "name",
                      },
                    ],
                  },
                  count: 1,
                  from: ["trash"],
                },
                raw: "By placing 1 [Garurumon] and 1 [WereGarurumon] from your trash as 1 of your [Gabumon]'s bottom digivolution cards",
                underFilter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Gabumon"],
                      match: "name",
                    },
                  ],
                },
                destination: "digivolutionStack",
                position: "bottom",
                host: "target",
                bindHostAs: "bt15091Gabumon",
              },
              {
                kind: "place",
                target: {
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    nameOrTrait: [
                      {
                        tokens: ["WereGarurumon"],
                        match: "name",
                      },
                    ],
                  },
                  count: 1,
                  from: ["trash"],
                },
                destination: "digivolutionStack",
                position: "bottom",
                host: { filter: { boundRef: "bt15091Gabumon" }, count: 1 },
              },
            ],
          },
          optional: true,
          abortOnDecline: true,
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Gabumon"],
                      match: "name",
                    },
                  ],
                },
                count: 1,
                fromSelectionRef: "bt15091Gabumon",
              },
              into: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["MetalGarurumon"],
                    match: "name",
                  },
                ],
              },
              payCost: false,
              from: ["hand"],
              ignoreRequirements: true,
              optional: true,
            },
          ],
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
              nameOrTrait: [
                {
                  tokens: ["Gabumon"],
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

registerIrCard("BT15-091", compiled);
export { compiled };
