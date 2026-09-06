import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Yellow", level: 4 },
        { color: "Blue", level: 4 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Yellow", level: 4 },
        { color: "Black", level: 4 },
      ],
    },
  ],
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTopOrBottom",
          controller: "mine",
          amount: 1,
          source: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              trait: ["Angel", "Archangel", "Three Great Angels", "Iliad"],
              zone: ["hand", "digivolutionCards"],
              hostFilter: { kind: ["Digimon"] },
            },
            count: 1,
          },
          optional: true,
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "mine",
          bothPlayers: true,
          amount: 1,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTopOrBottom",
          controller: "mine",
          amount: 1,
          source: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              trait: ["Angel", "Archangel", "Three Great Angels", "Iliad"],
              zone: ["hand", "digivolutionCards"],
              hostFilter: { kind: ["Digimon"] },
            },
            count: 1,
          },
          optional: true,
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "mine",
          bothPlayers: true,
          amount: 1,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAddSecurity",
          fireCondition: {
            kind: "triggerSecurityIsYours",
          },
          actions: [
            {
              kind: "DeDigivolve",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: 1,
            },
          ],
          raw: "whenAddSecurity",
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: {
            controller: "mine",
          },
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
              amount: -4000,
              duration: "forTheTurn",
            },
          ],
          raw: "whenSecurityRemoved",
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
      level: 4,
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-038", compiled);
