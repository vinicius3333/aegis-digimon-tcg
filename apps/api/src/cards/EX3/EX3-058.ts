import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-verified IR for EX3-058 (Shadramon).
// Errata (2022-11-11): choose either evolving another Digimon into a red level 4
// [Free] card from trash, or DNA digivolving this Digimon and another Digimon.
// KB Q3425: the base selected by the first option does not itself need to be red.
// KB Q3426: the inherited end-of-turn DNA may resolve after the WD DNA passes memory.
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
