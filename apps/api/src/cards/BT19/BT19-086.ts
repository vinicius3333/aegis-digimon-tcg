// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT19-086 Ryo Akiyama (Tamer):
// [Start of Your Main Phase] By placing 1 Option card with the [Device] trait
//   from your hand in the battle area, <Draw 1>.
// [Main] By suspending this Tamer and trashing 4 of your Option cards with the
//   [Device] trait in the battle area, you may play 1 [Cyberdramon] from your
//   hand or trash without paying the cost.
// KB Q3151: you may choose not to play Cyberdramon after paying the cost.

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "battleArea",
                controller: "mine",
                kind: ["Option"],
                nameOrTrait: [
                  {
                    tokens: ["Device"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            destination: "battleArea",
            raw: "By placing 1 Option card with the [Device] trait from your hand in the battle area",
          },
          optional: true,
          abortOnDecline: true,
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
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
                raw: "By suspending this Tamer",
              },
              {
                kind: "deleteOwn",
                target: {
                  filter: {
                    controller: "mine",
                    zone: "battleArea",
                    kind: ["Option"],
                    nameOrTrait: [
                      {
                        tokens: ["Device"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 4,
                },
                raw: "and trashing 4 Option cards with the [Device] trait in the battle area",
              },
            ],
            raw: "By suspending this Tamer and trashing 4 Option cards with the [Device] trait in the battle area",
          },
          optional: true,
          abortOnDecline: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Cyberdramon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              from: ["hand", "trash"],
              payCost: false,
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

registerIrCard("BT19-086", compiled);
