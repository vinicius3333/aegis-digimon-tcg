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
            target: {
              filter: {
                controller: "mine",
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 card from your hand face down under any of your Tamers with the [DATA SQUAD] trait",
            underFilter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["DATA SQUAD"],
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
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "handAtMost",
            value: 7,
            raw: "your hand has 7 or fewer cards",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 2,
      traits: ["DATA SQUAD"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST24-02", compiled);
