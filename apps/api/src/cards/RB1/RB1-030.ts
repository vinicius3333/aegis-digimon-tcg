import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          grant: "effects",
          tokens: ["OnDeletionDeleteLowest"],
          duration: "untilOpponentTurnEnd",
          optional: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }],
              },
              count: 1,
            },
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          grant: "effects",
          tokens: ["OnDeletionDeleteLowest"],
          duration: "untilOpponentTurnEnd",
          optional: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }],
              },
              count: 1,
            },
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          grant: "effects",
          excludeInherited: true,
          filter: {
            nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }],
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          grant: "effects",
          excludeInherited: true,
          filter: {
            nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }],
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      names: ["Gammamon"],
      cost: 3,
      isAlternate: false,
    },
  ],
};

registerIrCard("RB1-030", compiled);
