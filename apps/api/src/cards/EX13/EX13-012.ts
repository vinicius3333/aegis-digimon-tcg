import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
    },
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Play a white [Huckmon]-text card", "Use a white [Huckmon]-text Option"],
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controllerDefault: "mine",
                    zone: "hand",
                    kind: ["Digimon", "Tamer"],
                    colors: ["White"],
                    nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: true,
                allowDigiXros: true,
                reduceCostBy: 3,
                optional: true,
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                filter: {
                  controllerDefault: "mine",
                  zone: "hand",
                  kind: ["Option"],
                  colors: ["White"],
                  nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
                },
                from: ["hand"],
                payCost: true,
                allowDigiXros: true,
                reduceCostBy: 3,
                optional: true,
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Play a white [Huckmon]-text card", "Use a white [Huckmon]-text Option"],
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controllerDefault: "mine",
                    zone: "hand",
                    kind: ["Digimon", "Tamer"],
                    colors: ["White"],
                    nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 3,
                optional: true,
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                filter: {
                  controllerDefault: "mine",
                  zone: "hand",
                  kind: ["Option"],
                  colors: ["White"],
                  nameOrTrait: [{ tokens: ["Huckmon"], match: "text" }],
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 3,
                optional: true,
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      texts: ["Huckmon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX13-012", compiled);
