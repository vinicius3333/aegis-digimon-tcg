// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT23-068 (GranDracmon).
// [Start of Your Main Phase] [On Deletion] 1 of your Digimon may digivolve into a
// level 6 or lower [Undead] or [Dark Animal] Digimon from trash without cost.
// [When Digivolving] play 1 level 4 or lower purple Digimon from trash without cost.
// [All Turns] [Once Per Turn] When any of your Digimon digivolve FROM THE TRASH,
// delete ALL of your opponent's lowest-level Digimon.
// KB Q5336: also triggers when digivolving into this card itself from the trash.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: {
              op: "lte",
              value: 6,
            },
            nameOrTrait: [
              {
                tokens: ["Undead", "Dark Animal"],
                match: "trait",
              },
            ],
          },
          payCost: false,
          from: ["trash"],
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: {
              op: "lte",
              value: 6,
            },
            nameOrTrait: [
              {
                tokens: ["Undead", "Dark Animal"],
                match: "trait",
              },
            ],
          },
          payCost: false,
          from: ["trash"],
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Purple"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          fireCondition: {
            kind: "digivolvedFromZone",
            zone: "trash",
            raw: "digivolves from the trash",
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  superlative: "lowestLevel",
                },
                count: "all",
              },
            },
          ],
          raw: "When any of your Digimon digivolve from the trash, delete all of your opponent's lowest level Digimon",
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
      traits: ["Undead", "CS"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-068", compiled);
