// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT20-018 Ouryumon:
// <Piercing>
// [On Play][When Digivolving] <De-Digivolve 2> 1 of your opponent's Digimon.
//   Then, if during an attack, 1 of your Digimon in the breeding area may
//   digivolve into a level 6 or lower [Chronicle] trait Digimon card in the
//   hand or trash without paying the cost.
// [All Turns][Once Per Turn] When security stacks are removed from, delete
//   1 of your opponent's Digimon with the lowest DP.
// [When Attacking][Once Per Turn] If this Digimon is [Alphamon: Ouryuken],
//   trash your opponent's top security card.

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
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
          amount: 2,
        },
        {
          kind: "Digivolve",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, targetBreeding: true },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 6 },
            nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
          },
          payCost: false,
          from: ["hand", "trash"],
          optional: true,
          condition: { kind: "duringAttack", raw: "during an attack" },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
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
          amount: 2,
        },
        {
          kind: "Digivolve",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, targetBreeding: true },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 6 },
            nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
          },
          payCost: false,
          from: ["hand", "trash"],
          optional: true,
          condition: { kind: "duringAttack", raw: "during an attack" },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "any" },
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
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "opponent",
              zone: "security",
            },
            count: 1,
            fromTop: true,
          },
          condition: {
            kind: "selfHasName",
            names: ["Alphamon: Ouryuken"],
            raw: "this Digimon is [Alphamon: Ouryuken]",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-018", compiled);
