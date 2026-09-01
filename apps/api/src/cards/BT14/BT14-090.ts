// @ts-nocheck
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
                  tokens: ["Tai Kamiya"],
                  match: "name",
                },
              ],
            },
            raw: "you have a Tamer with [Tai Kamiya] in its name",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          // Q2466: the two trash placements are paid first; only the evolution
          // that follows is optional. A direct optional Digivolve would prompt
          // before paying the placement and force the evolution after payment.
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
                        tokens: ["Greymon"],
                        match: "name",
                      },
                    ],
                  },
                  count: 1,
                  from: ["trash"],
                },
                raw: "By placing 1 [Greymon] and 1 [MetalGreymon] from your trash as 1 of your [Agumon]'s bottom digivolution cards",
                underFilter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Agumon"],
                      match: "name",
                    },
                  ],
                },
                destination: "digivolutionStack",
                position: "bottom",
                host: "target",
                bindHostAs: "bt14090Agumon",
              },
              {
                kind: "place",
                target: {
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    nameOrTrait: [
                      {
                        tokens: ["MetalGreymon"],
                        match: "name",
                      },
                    ],
                  },
                  count: 1,
                  from: ["trash"],
                },
                underFilter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Agumon"],
                      match: "name",
                    },
                  ],
                },
                destination: "digivolutionStack",
                position: "bottom",
                host: { filter: { boundRef: "bt14090Agumon" }, count: 1 },
              },
            ],
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Agumon"],
                      match: "name",
                    },
                  ],
                },
                count: 1,
                fromSelectionRef: "bt14090Agumon",
              },
              into: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["WarGreymon"],
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
          optional: true,
          abortOnDecline: true,
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
                  tokens: ["Agumon"],
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

export { compiled };
registerIrCard("BT14-090", compiled);
