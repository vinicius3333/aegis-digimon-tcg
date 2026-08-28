// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Split the play into mutually exclusive branches so Eiji Nagasumi in the
// digivolution cards raises the level ceiling from 3 to 4.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              levelComparison: { op: "lte", value: 3 },
              nameOrTrait: [{ tokens: ["Dark Animal", "SoC"], match: "trait" }],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: {
            kind: "not",
            condition: {
              kind: "selfDigivolutionStackMatchesFilter",
              filter: {
                nameOrTrait: [{ tokens: ["Eiji Nagasumi"], match: "name" }],
              },
            },
          },
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ tokens: ["Dark Animal", "SoC"], match: "trait" }],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: {
            kind: "selfDigivolutionStackMatchesFilter",
            filter: {
              nameOrTrait: [{ tokens: ["Eiji Nagasumi"], match: "name" }],
            },
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
              },
              count: 1,
            },
            raw: "By trashing 1 card in your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["Dark Animal", "SoC"], match: "trait" }],
          },
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
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
};

registerIrCard("BT14-079", compiled);
