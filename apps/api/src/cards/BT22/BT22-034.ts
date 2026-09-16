import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDiscardSecurity",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "ModifyDP",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                amount: -6000,
                duration: "untilOpponentTurnEnd",
                cost: { kind: "trashSecurityTop", raw: "By trashing your top security card" },
                optional: true,
                abortOnDecline: true,
              },
            ],
            [
              {
                kind: "ModifyDP",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                amount: -3000,
                duration: "untilOpponentTurnEnd",
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "ModifyDP",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                amount: -6000,
                duration: "untilOpponentTurnEnd",
                cost: { kind: "trashSecurityTop", raw: "By trashing your top security card" },
                optional: true,
                abortOnDecline: true,
              },
            ],
            [
              {
                kind: "ModifyDP",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                amount: -3000,
                duration: "untilOpponentTurnEnd",
              },
            ],
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
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
          amount: -2000,
          duration: "forTheTurn",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 3, colors: ["Yellow"], cost: 2, isAlternate: false },
    { level: 3, traits: ["CS"], cost: 2, isAlternate: true },
  ],
};

registerIrCard("BT22-034", compiled);
