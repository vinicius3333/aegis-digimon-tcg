import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const trashThreeSources: Action = {
  effectTextPart: "[On Play] [When Digivolving] Trash any 3 digivolution cards from 1 of your opponent's Digimon.",
  kind: "TrashDigivolution",
  target: {
    filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
    count: 1,
  },
  amount: 3,
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        trashThreeSources,
        {
          effectTextPart: "Then, if played by effects, delete 1 of your opponent's Digimon with no digivolution cards.",
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" },
            count: 1,
          },
          condition: { kind: "triggerEnteredByEffect" },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [trashThreeSources],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [
                { tokens: ["Seadramon"], match: "name" },
                { tokens: ["TS"], match: "trait" },
              ],
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
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          cost: {
            kind: "place",
            targetIsPermanent: true,
            target: {
              filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
              count: 1,
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            raw: "By placing 1 of your other Digimon as this Digimon's bottom digivolution card",
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
      level: 4,
      traitSubstrings: ["Aqua"],
      cost: 3,
      isAlternate: true,
    },
    {
      traits: ["Sea Animal"],
      cost: 3,
      isAlternate: true,
      level: 4,
    },
    {
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
      level: 4,
    },
  ],
};

registerIrCard("BT24-074", compiled);
