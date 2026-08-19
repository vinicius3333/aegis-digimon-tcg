// @ts-nocheck
// Hand-authored: KB Q5363 — compound cost (suspend + return Hudie to hand).
// Both actions are mandatory once the effect is activated; the Suspend action carries
// the optional gate. Encoded as an explicit Suspend → Return → PlayWithoutCost sequence.
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
          kind: "Suspend",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Hudie"], match: "trait" }],
            },
            count: 1,
          },
          to: "hand",
          abortOnDecline: true,
        },
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
