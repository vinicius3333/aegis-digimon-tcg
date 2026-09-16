import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            controller: "mine",
            kind: ["Option"],
            nameOrTrait: [{ tokens: ["Onmyōjutsu", "Plug-In"], match: "trait" }],
          },
          from: ["hand", "underTamers"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            controller: "mine",
            kind: ["Option"],
            nameOrTrait: [{ tokens: ["Onmyōjutsu", "Plug-In"], match: "trait" }],
          },
          from: ["hand", "underTamers"],
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
          event: "whenOptionUsed",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
            },
          ],
          cost: {
            kind: "place",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" },
              count: 1,
              from: ["battleArea"],
            },
            destination: "security",
            position: "bottom",
            targetIsPermanent: true,
            raw: "by placing 1 of your opponent's Digimon with the lowest DP as the bottom security card",
          },
        },
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
            },
          ],
          cost: {
            kind: "place",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" },
              count: 1,
              from: ["battleArea"],
            },
            destination: "security",
            position: "bottom",
            targetIsPermanent: true,
            raw: "by placing 1 of your opponent's Digimon with the lowest DP as the bottom security card",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Sakuyamon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST22-06", compiled);
