import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] If you have 3 or more security cards, you may add your top security card to the hand.",
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          toTop: true,
          condition: {
            kind: "securityAtLeast",
            value: 3,
          },
          optional: true,
        },
        {
          effectTextPart: "Then, if you have 2 or fewer security cards, ＜Recovery +1 (Deck)＞.",
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 2,
            raw: "you have 2 or fewer security cards",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] If you have 3 or more security cards, you may add your top security card to the hand.",
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          toTop: true,
          condition: {
            kind: "securityAtLeast",
            value: 3,
          },
          optional: true,
        },
        {
          effectTextPart: "Then, if you have 2 or fewer security cards, ＜Recovery +1 (Deck)＞.",
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 2,
            raw: "you have 2 or fewer security cards",
          },
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
              kind: "GainMemory",
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
      namesExact: ["Pulsemon"],
      cost: 2,
      isAlternate: true,
    },
    {
      level: 3,
      traits: ["SEEKERS"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT20-032", compiled);
