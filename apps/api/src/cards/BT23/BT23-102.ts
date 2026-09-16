import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 5, traits: ["CS"], cost: 5, isAlternate: true }],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Yellow", level: 5 },
        { color: "Purple", level: 5 },
      ],
    },
  ],
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
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Partition",
          raw: "＜Partition ([Angewomon] & [LadyDevimon])＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] You may play 1 level 5 or lower yellow or purple card from your hand or trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Yellow", "Purple"],
              levelComparison: { op: "lte", value: 5 },
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          effectTextPart:
            "Then, if this Digimon's stack has 2 or more same-level cards, trash the top cards of both players' security stacks so that they have 3 cards left.",
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "mine",
          bothPlayers: true,
          leaveCount: 3,
          condition: {
            kind: "selfDigivolutionStackHasSameLevelPair",
            raw: "this Digimon's stack has 2 or more same-level cards",
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
          sourceFilter: { controller: "any" },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addBottom",
              controller: "any",
              amount: 1,
              source: {
                filter: {
                  isDigimon: true,
                  controller: "any",
                },
                count: 1,
                upTo: false,
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT23-102", compiled);
