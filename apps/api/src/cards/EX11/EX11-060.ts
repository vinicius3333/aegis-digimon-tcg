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
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            or: [
              {
                isToken: true,
              },
              {
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Puppet"],
                    match: "trait",
                  },
                ],
              },
            ],
          },
          actions: [
            {
              effectTextPart:
                "[All Turns] When any of your Tokens or [Puppet] trait Digimon are deleted, by suspending this Tamer, ＜Draw 1＞",
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
              effectTextPart:
                "If deleted by ＜Overclock＞, you may play 1 level 4 or lower [Puppet] trait Digimon card from your hand without paying the cost.",
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Puppet"],
                      match: "trait",
                    },
                  ],
                  levelComparison: {
                    op: "lte",
                    value: 4,
                  },
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              optional: true,
              condition: {
                kind: "triggerRemovalCause",
                removalCause: "byEffect",
                removalMechanic: "Overclock",
                raw: "if deleted by ＜Overclock＞",
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

registerIrCard("EX11-060", compiled);
