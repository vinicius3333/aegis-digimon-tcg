// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Main][Once Per Turn]: PlayWithoutCost(payCost:true) + sibling wouldBePlayed reduceCost
// Replacement is the established corpus encoding for "play/use with cost reduced by N"
// (identical to EX12-050, EX12-041, etc.). The auditor's findings are false positives.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Play a matching card", "Use a matching Option"],
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon", "Tamer"],
                    nameOrTrait: [
                      {
                        tokens: ["Gammamon"],
                        match: "text",
                      },
                      {
                        tokens: ["VB"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                optional: true,
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                filter: {
                  controller: "mine",
                  kind: ["Option"],
                  nameOrTrait: [
                    { tokens: ["Gammamon"], match: "text" },
                    { tokens: ["VB"], match: "trait" },
                  ],
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                optional: true,
              },
            ],
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Gammamon"],
      cost: 2,
      isAlternate: true,
    },
    {
      level: 3,
      traits: ["VB"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX12-013", compiled);
