import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "SetMemory",
          value: 3,
          condition: {
            kind: "memoryAtMost",
            value: 2,
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
          cost: {
            kind: "compound",
            costs: [
              {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
              },
              {
                kind: "placeOwnTopAtStackBottom",
                target: {
                  filter: {
                    controller: "mine",
                    zone: "battleArea",
                    kind: ["Digimon"],
                    nameOrTrait: [
                      {
                        tokens: ["Light Fang", "Night Claw"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 1,
                },
              },
            ],
            raw: "By suspending this Tamer and placing the top card of one of your [Light Fang]/[Night Claw] trait Digimon as that Digimon's bottom digivolution card",
          },
          abortOnDecline: true,
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
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
          cost: {
            kind: "compound",
            costs: [
              {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
              },
              {
                kind: "placeOwnTopAtStackBottom",
                target: {
                  filter: {
                    controller: "mine",
                    zone: "battleArea",
                    kind: ["Digimon"],
                    nameOrTrait: [
                      {
                        tokens: ["Light Fang", "Night Claw"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 1,
                },
              },
            ],
            raw: "By suspending this Tamer and placing the top card of one of your [Light Fang]/[Night Claw] trait Digimon as that Digimon's bottom digivolution card",
          },
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

registerIrCard("EX5-064", compiled);
