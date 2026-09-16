import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "CostModifier",
          costType: "play",
          mode: "reduce",
          amount: 4,
          handResident: true,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          duration: "permanent",
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: "security",
              faceUp: true,
              nameOrTrait: [{ tokens: ["Wind Guardians"], match: "nameExact" }],
            },
            raw: "you have a face-up [Wind Guardians] security card",
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: {
            controller: "any",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  superlative: "lowestDP",
                },
                count: 1,
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["WG"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("P-222", compiled);
