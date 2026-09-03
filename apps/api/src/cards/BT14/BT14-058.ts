import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "forTheTurn",
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Satsuki Tamahime"],
                    match: "name",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 [Satsuki Tamahime] from your hand as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "forTheTurn",
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Satsuki Tamahime"],
                    match: "name",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 [Satsuki Tamahime] from your hand as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-058", compiled);
