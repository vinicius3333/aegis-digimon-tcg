// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q6119: effect activates even with 8+ cards in hand; the "7 or fewer" condition
// gates only the Draw 1 action, not the cost/trigger. Main PlayWithoutCost reads
// from under any of your Tamers with cost reduced by 1 (not free).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          amount: 1,
          controller: "mine",
          condition: {
            kind: "handSizeAtMost",
            value: 7,
            raw: "if you have 7 or fewer cards in your hand",
          },
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Xros Heart", "Twilight"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand", "trash"],
            },
            raw: "By placing 1 [Xros Heart] or [Twilight] trait Digimon card from your hand or trash under this Tamer",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          amount: 1,
          controller: "mine",
          condition: {
            kind: "handSizeAtMost",
            value: 7,
            raw: "if you have 7 or fewer cards in your hand",
          },
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Xros Heart", "Twilight"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand", "trash"],
            },
            raw: "By placing 1 [Xros Heart] or [Twilight] trait Digimon card from your hand or trash under this Tamer",
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
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "underTamer",
              levelComparison: {
                op: "gte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["Xros Heart"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["underTamer"],
          payCost: true,
          costOverride: {
            kind: "reduceCost",
            amount: 1,
          },
          cost: {
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

registerIrCard("P-224", compiled);
