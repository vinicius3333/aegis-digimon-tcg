import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
          labels: ["Play a matching card", "Use a matching Option"],
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controllerDefault: "mine",
                    zone: "hand",
                    kind: ["Digimon", "Tamer"],
                    nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: true,
                allowDigiXros: true,
                reduceCostBy: 1,
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
                  nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 1,
                optional: true,
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

registerIrCard("EX13-005", compiled);
