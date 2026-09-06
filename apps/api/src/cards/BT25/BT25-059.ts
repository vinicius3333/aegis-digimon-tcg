import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 5,
              raw: "reduce the cost by 5",
              condition: {
                kind: "totalDigimonGte",
                filter: { suspended: true, kind: ["Digimon"] },
                value: 2,
                raw: "there are 2 or more suspended Digimon",
              },
            },
          ],
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
            count: 2,
            upTo: true,
          },
          optional: true,
        },
        {
          kind: "GrantStatic",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              trait: ["Vegetation", "TS"],
              suspended: true,
            },
            count: "all",
          },
          grant: "immuneToOpponentDigimonEffects",
          tokens: [],
          duration: "untilOpponentTurnEnd",
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
            count: 2,
            upTo: true,
          },
          optional: true,
        },
        {
          kind: "GrantStatic",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              trait: ["Vegetation", "TS"],
              suspended: true,
            },
            count: "all",
          },
          grant: "immuneToOpponentDigimonEffects",
          tokens: [],
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: -3000,
              duration: "untilOpponentTurnEnd",
              scaling: {
                per: 1,
                filter: {
                  controllerDefault: "any",
                  suspended: true,
                  kind: ["Digimon"],
                },
                unit: "cards",
              },
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
      traits: ["Vegetation", "TS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-059", compiled);
