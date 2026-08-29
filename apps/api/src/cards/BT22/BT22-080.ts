import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              zone: "digivolutionCards",
              source: "digivolutionCards",
              hostFilter: { isSelfRef: true },
              nameOrTrait: [{ tokens: ["Eater (Species Form)"], match: "name" }],
            },
            count: 1,
          },
          underFilter: {
            controller: "mine",
            zone: "breeding",
            nameOrTrait: [{ tokens: ["Mother Eater"], match: "name" }],
          },
          from: ["digivolutionCards"],
          position: "bottom",
          optional: true,
        },
      ],
    },
    {
      trigger: "OnSecurityCheck",
      turnCondition: "yourTurn",
      condition: { kind: "triggerAttackerIsSelf" },
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Eater"], match: "trait" }],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 1,
              optional: true,
              raw: "reduce the play costs by 1",
            },
          ],
        },
      ],
      isInherited: true,
      isBreeding: true,
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Eater (Species Form)"], cost: 2, isAlternate: true }],
};

registerIrCard("BT22-080", compiled);
export default compiled;
