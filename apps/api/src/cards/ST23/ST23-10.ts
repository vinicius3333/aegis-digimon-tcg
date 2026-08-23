// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "place",
            faceDown: true,
            target: {
              filter: {
                controller: "mine",
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 card from your hand face down under any of your Tamers with the [Glowing Dawn] trait",
            underFilter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Glowing Dawn"],
                  match: "trait",
                },
              ],
            },
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
  digivolutionRequirement: [
    {
      level: 2,
      traits: ["Glowing Dawn"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST23-10", compiled);
