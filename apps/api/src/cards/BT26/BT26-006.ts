import type { CompiledCard, Cost } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cost: Cost = {
  kind: "trash",
  target: {
    filter: {
      zone: "digivolutionCards",
      controllerDefault: "mine",
      hostFilter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] },
    },
    count: 2,
  },
  raw: "By trashing any 2 digivolution cards from your [Bagra Army] trait Digimon",
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controllerDefault: "mine",
                    zone: "hand",
                    kind: ["Digimon", "Tamer"],
                    nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                optional: true,
                payCostBeforeOptional: true,
                cost,
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                filter: {
                  controllerDefault: "mine",
                  zone: "hand",
                  kind: ["Option"],
                  nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                optional: true,
                payCostBeforeOptional: true,
                cost,
              },
            ],
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-006", compiled);
