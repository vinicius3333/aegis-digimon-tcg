// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controllerDefault: "mine" },
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: {
            nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
          },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["CS"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "By placing this [CS] trait Digimon's top stacked card as its bottom digivolution card",
          },
          optional: true,
          abortOnDecline: true,
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
      traits: ["CS"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-044", compiled);
