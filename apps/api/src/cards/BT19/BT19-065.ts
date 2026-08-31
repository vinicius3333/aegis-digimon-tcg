// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Play][When Digivolving]: Delete 1 level 5 or lower Digimon (any controller per KB Q3128).
// DigiXros -1: up to 5 Lv.5-or-lower [Cyborg] or [Composite] trait Digimon cards
// with different card numbers (each contributing -1 memory to the play cost).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 5 },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 5 },
            },
            count: 1,
          },
        },
      ],
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
              levelComparison: { op: "lte", value: 5 },
              nameOrTrait: [{ tokens: ["Cyborg", "Composite"], match: "trait" }],
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
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Composite"],
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Composite", "Wicked God"], match: "trait" }],
                },
                count: 1,
              },
              optional: true,
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
  digiXrosRequirement: [
    {
      materials: [
        {
          kind: ["Digimon"],
          levelComparison: { op: "lte", value: 5 },
          nameOrTrait: [{ tokens: ["Cyborg", "Composite"], match: "trait" }],
          differentCardNumbers: true,
        },
      ],
      count: 1,
      maxMaterials: 5,
    },
  ],
};

registerIrCard("BT19-065", compiled);
