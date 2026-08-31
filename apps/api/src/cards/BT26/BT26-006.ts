// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cost = {
  kind: "trash",
  target: {
    filter: {
      zone: "digivolutionCards",
      controllerDefault: "mine",
      hostFilter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] },
    },
    count: 2,
  },
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
                    // "play or use 1 [Bagra Army] trait card": the play half covers both
                    // playable kinds (BT10-093 / EX10-064 are [Bagra Army] Tamers); the
                    // use half below covers Option cards.
                    kind: ["Digimon", "Tamer"],
                    nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                allowDigiXros: true,
                optional: true,
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
