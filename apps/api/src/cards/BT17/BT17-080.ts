import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              zone: "battleArea",
              nameOrTrait: [
                {
                  tokens: ["Guilmon", "Growlmon", "Gallantmon"],
                  match: "name",
                },
              ],
            },
            raw: "you have a Digimon with [Guilmon]/[Growlmon]/[Gallantmon] in its name",
          },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Guilmon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
            fromSelectionRef: "takatoTarget",
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Gallantmon"],
                match: "nameExact",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          ignoreRequirements: true,
          optional: true,
          payCostBeforeOptional: true,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "battleArea",
                controller: "mine",
                kind: ["Tamer"],
                nameOrTrait: [{ tokens: ["Takato Matsuki"], match: "nameExact" }],
                isSelfRef: true,
              },
              count: 1,
            },
            raw: "By placing this Tamer and 1 [Growlmon] and 1 [WarGrowlmon] from your trash as the bottom digivolution cards of 1 of your [Guilmon]",
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Guilmon"],
                  match: "nameExact",
                },
              ],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            targetIsPermanent: true,
            bindHostAs: "takatoTarget",
          },
          abortOnDecline: true,
          additionalCosts: [
            {
              kind: "place",
              target: {
                filter: {
                  zone: "trash",
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Growlmon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
                from: ["trash"],
              },
              raw: "By placing this Tamer and 1 [Growlmon] and 1 [WarGrowlmon] from your trash as the bottom digivolution cards of 1 of your [Guilmon]",
              host: { filter: { boundRef: "takatoTarget" }, count: 1 },
              destination: "digivolutionStack",
              position: "bottom",
            },
            {
              kind: "place",
              target: {
                filter: {
                  zone: "trash",
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["WarGrowlmon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
                from: ["trash"],
              },
              raw: "By placing this Tamer and 1 [Growlmon] and 1 [WarGrowlmon] from your trash as the bottom digivolution cards of 1 of your [Guilmon]",
              host: { filter: { boundRef: "takatoTarget" }, count: 1 },
              destination: "digivolutionStack",
              position: "bottom",
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
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-080", compiled);
