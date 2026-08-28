import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenMovedFromBreeding",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["X-Antibody"], match: "trait" }],
          },
          actions: [
            { kind: "GainMemory", amount: 1 },
            { kind: "Draw", amount: 1, controller: "mine" },
          ],
          raw: "When one of your Digimon with [X-Antibody] moves from breeding to battle",
        },
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            colors: ["Black"],
            nameOrTrait: [{ tokens: ["X-Antibody"], match: "trait" }],
          },
          actions: [
            {
              kind: "PlaceUnder",
              target: {
                filter: {
                  controller: "mine",
                  zone: "hand",
                  nameOrTrait: [{ tokens: ["X-Antibody"], match: "trait" }],
                },
                count: 1,
              },
              from: ["hand"],
              underFilter: { isTriggerSource: true },
              position: "bottom",
              optional: true,
              cost: {
                kind: "suspend",
                target: {
                  filter: { isSelfRef: true },
                  count: 1,
                  isSelf: true,
                },
              },
            },
          ],
          raw: "When one of your black Digimon with [X-Antibody] attacks",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-092", compiled);
export default compiled;
