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
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Ghost"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              effectTextPart:
                "[Your Turn] When one of your [Ghost] trait Digimon attacks, by suspending this Tamer, ＜Draw 1＞ and trash 1 card in your hand.",
              kind: "Draw",
              controller: "mine",
              amount: 1,
              cost: {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
                raw: "by suspending this Tamer",
              },
              optional: true,
              abortOnDecline: true,
            },
            {
              kind: "Trash",
              target: {
                filter: {
                  zone: "hand",
                  controller: "mine",
                },
                count: 1,
              },
            },
            {
              effectTextPart:
                "If attacking by ＜Execute＞, it may digivolve into a [Ghost] trait Digimon card in the hand with the digivolution cost reduced by 2.",
              kind: "Digivolve",
              target: {
                sourceRef: "triggerSubject",
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Ghost"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Ghost"],
                    match: "trait",
                  },
                ],
              },
              from: ["hand"],
              payCost: true,
              reduceCost: 2,
              optional: true,
              condition: {
                kind: "triggerAttackBy",
                keyword: "Execute",
                raw: "if attacking by ＜Execute＞",
              },
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

registerIrCard("EX11-068", compiled);
