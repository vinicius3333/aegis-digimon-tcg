import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
          effectTextPart: "[On Play] [When Digivolving] ＜De-Digivolve 2＞ 1 of your opponent's Digimon.",
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
          effectTextPart: "[On Play] [When Digivolving] ＜De-Digivolve 2＞ 1 of your opponent's Digimon.",
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
              position: "top",
            },
            count: 1,
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
