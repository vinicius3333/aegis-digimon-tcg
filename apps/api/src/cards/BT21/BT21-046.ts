// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Start of Your Main Phase] / [When Digivolving] (single effect, dual trigger):
// This Digimon may digivolve into [Coredramon] from your hand without paying the cost.
// [End of Your Turn] inherited: May DNA digivolve this Digimon + any of your other Digimon
// into a Digimon card in your hand (paying the cost).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Coredramon"],
                match: "nameExact",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
      ],
      optional: true,
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Coredramon"],
                match: "nameExact",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
      ],
      optional: true,
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              includesSelf: true,
            },
            count: 2,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            zone: "hand",
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
  digivolutionRequirement: [
    {
      namesExact: ["Dracomon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT21-046", compiled);
