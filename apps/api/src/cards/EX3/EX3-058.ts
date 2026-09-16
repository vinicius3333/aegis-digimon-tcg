import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "Digivolve",
                target: {
                  filter: {
                    controller: "mine",
                    excludeSelf: true,
                    kind: ["Digimon"],
                  },
                  count: 1,
                  zone: "battleArea",
                },
                into: {
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    kind: ["Digimon"],
                    colors: ["Red"],
                    levels: [4],
                    nameOrTrait: [
                      {
                        tokens: ["Free"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 1,
                },
                payCost: true,
                ignoreDigivolutionRequirements: false,
                from: ["trash"],
                optional: true,
              },
            ],
            [
              {
                kind: "DnaDigivolve",
                materials: [
                  {
                    filter: {
                      isSelfRef: true,
                    },
                    count: 1,
                    zone: "battleArea",
                  },
                  {
                    filter: {
                      controller: "mine",
                      excludeSelf: true,
                      kind: ["Digimon"],
                    },
                    count: 1,
                    zone: "battleArea",
                  },
                ],
                into: {
                  filter: {
                    zone: "hand",
                    controller: "mine",
                    kind: ["Digimon"],
                  },
                  count: 1,
                },
                payCost: true,
                optional: true,
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: [
            {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              zone: "battleArea",
            },
            {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
              },
              count: 1,
              zone: "battleArea",
            },
          ],
          into: {
            filter: {
              zone: "hand",
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          payCost: true,
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-058", compiled);
