// @ts-nocheck
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
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            keywords: ["Save"],
          },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: {},
                count: 1,
                sourceRef: "triggerSubject",
              },
              keyword: {
                keyword: "Alliance",
                raw: "＜Alliance＞",
              },
              duration: "forTheTurn",
            },
          ],
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
                kind: "place",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    zone: "underTamers",
                    keywords: ["Save"],
                  },
                  count: 1,
                  from: ["underTamers"],
                },
                destination: "digivolutionStack",
                position: "bottom",
                host: "triggerSource",
              },
            ],
            raw: "by suspending this Tamer and placing 1 Digimon card with ＜Save＞ in its text from under your Tamers as that Digimon's bottom digivolution card",
          },
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

registerIrCard("EX10-067", compiled);
