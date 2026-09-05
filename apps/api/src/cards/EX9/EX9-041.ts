// @ts-nocheck
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
          event: "wouldDigivolve",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Ver.5"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 1,
              raw: "reduce the digivolution cost by 1",
              scaling: {
                per: 1,
                filter: {
                  isSelfRef: true,
                  faceDown: true,
                },
                unit: "digivolutionCards",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Fortitude",
          raw: "＜Fortitude＞",
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
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
          to: "hand",
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
                faceDown: true,
                position: "bottom",
              },
              count: 1,
              isSelf: true,
            },
            raw: "by trashing this Digimon's bottom face-down digivolution card",
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
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: 1,
          },
          to: "hand",
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
                faceDown: true,
                position: "bottom",
              },
              count: 1,
              isSelf: true,
            },
            raw: "by trashing this Digimon's bottom face-down digivolution card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
            },
          ],
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
      namesExact: ["Raremon"],
      cost: 3,
      isAlternate: true,
    },
    {
      level: 4,
      traits: ["DM"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX9-041", compiled);
