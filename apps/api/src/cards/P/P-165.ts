// @ts-nocheck
// Hand-fixed: PlayToken uses "Familiar Token" name (matching tokens.ts);
// token [On Deletion] encoded as onDeletionOf SubTrigger on parent (AllTurns).
// [Security] finding 1 is a false positive (no [Main] in card text).
// endOfOpponentTurn is correct standard timing (KB Q5756 confirms deletion).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      timing: "endOfBattle",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          from: ["security"],
          payCost: false,
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Familiar Token"],
          count: 1,
          payCost: false,
        },
        {
          kind: "DelayedDelete",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Familiar Token"], match: "name" }],
            },
            count: 1,
            wasJustPlayed: true,
          },
          timing: "endOfOpponentTurn",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Familiar Token"],
          count: 1,
          payCost: false,
        },
        {
          kind: "DelayedDelete",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Familiar Token"], match: "name" }],
            },
            count: 1,
            wasJustPlayed: true,
          },
          timing: "endOfOpponentTurn",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            nameOrTrait: [{ tokens: ["Familiar Token"], match: "name" }],
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
              amount: -3000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("P-165", compiled);
