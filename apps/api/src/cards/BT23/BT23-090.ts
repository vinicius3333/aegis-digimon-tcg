// @ts-nocheck
// Hand-authored: KB Q5363 — compound cost (suspend + return Hudie to hand).
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
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "compound",
            costs: [
              {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              },
              {
                kind: "return",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }],
                  },
                  count: 1,
                },
                to: "hand",
              },
            ],
            raw: "By suspending this Tamer and returning 1 of your [Hudie] trait Digimon to the hand",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Hudie"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          amount: 1000,
          duration: "permanent",
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

registerIrCard("BT23-090", compiled);
