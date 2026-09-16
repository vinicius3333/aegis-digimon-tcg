import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] You may suspend 1 Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
        {
          effectTextPart:
            "Then, if this Digimon is suspended, ＜De-Digivolve1＞ 1 of your opponent's Digimon , and this Digimon isn't returned to hand or deck by an opponent's effect, and isn't affected by ＜De-Digivolve＞ effects until the end of your opponent's turn.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
          condition: {
            kind: "selfIsSuspended",
            raw: "this Digimon is suspended",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "beReturned",
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "selfIsSuspended",
            raw: "this Digimon is suspended",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "cantBeDeDigivolved",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "selfIsSuspended",
            raw: "this Digimon is suspended",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] You may suspend 1 Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
        {
          effectTextPart:
            "Then, if this Digimon is suspended, ＜De-Digivolve1＞ 1 of your opponent's Digimon , and this Digimon isn't returned to hand or deck by an opponent's effect, and isn't affected by ＜De-Digivolve＞ effects until the end of your opponent's turn.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
          condition: {
            kind: "selfIsSuspended",
            raw: "this Digimon is suspended",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "beReturned",
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "selfIsSuspended",
            raw: "this Digimon is suspended",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "cantBeDeDigivolved",
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "selfIsSuspended",
            raw: "this Digimon is suspended",
          },
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Dinosaur"],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
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
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["Dinosaur"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX8-043", compiled);
