import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          cost: {
            kind: "return",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By returning 1 of your Digimon to the hand",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          cost: {
            kind: "placeOwnTopAtStackBottom",
            target: {
              filter: {
                isSelfRef: true,
                controllerDefault: "mine",
                zone: "battleArea",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Night Claw", "Light Fang"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "By placing the top card of this Digimon with the [Night Claw]/[Light Fang] trait as this Digimon's bottom digivolution card",
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
  digivolutionRequirement: [{ level: 2, traits: ["Night Claw", "Light Fang"], cost: 0, isAlternate: true }],
};

registerIrCard("EX5-016", compiled);
