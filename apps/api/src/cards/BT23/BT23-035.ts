// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT23-035 Dynasmon
// Fix: [All Turns] Recovery action was outside the SubTrigger and had spurious `source` field.
//   Rules §16-6: <Recovery> places top-of-deck cards on TOP of security stack. `toTop: true`.
//   The conditional Recovery action is moved inside the SubTrigger as a second action.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ModifyDP",
          playerWide: true,
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: -6000,
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "security",
                position: "top",
              },
              count: 1,
            },
            raw: "By trashing your top security card",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          playerWide: true,
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: -6000,
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "security",
                position: "top",
              },
              count: 1,
            },
            raw: "By trashing your top security card",
          },
        },
      ],
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
              kind: "GainKeyword",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              keyword: {
                keyword: "SecurityAttack",
                amount: 1,
                raw: "＜Security Attack +1＞",
              },
              duration: "untilYourTurnEnd",
            },
            {
              kind: "SecurityManipulation",
              op: "placeAsSecurity",
              controller: "mine",
              from: ["deck"],
              source: {
                filter: { controllerDefault: "mine" },
                count: 1,
              },
              toTop: true,
              amount: 1,
              condition: {
                kind: "zoneCount",
                seat: "mine",
                zone: "security",
                op: "lte",
                value: 3,
                raw: "you have 3 or fewer security cards",
              },
            },
          ],
          raw: "When your security stack is removed from",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["Witchelny", "CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-035", compiled);
