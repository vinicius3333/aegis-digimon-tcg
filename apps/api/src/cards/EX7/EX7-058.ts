import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            '[On Play] [When Digivolving] 1 of your opponent\'s Digimon gains "[End of Attack] Delete this Digimon." until the end of their turn.',
          kind: "GrantAuraToOpponents",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          effectText: "[End of Attack] Delete this Digimon.",
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart:
            "Then, if this Digimon has [LadyDevimon]/[X Antibody] in its digivolution cards, you may play 1 [Volée & Zerdrücken] Token (Digimon/Lv.4/Purple/5000 DP/＜Blocker＞/＜Retaliation＞).",
          kind: "PlayToken",
          tokens: ["Volée & Zerdrücken"],
          count: 1,
          payCost: false,
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              { tokens: ["LadyDevimon"], match: "nameExact" },
              { tokens: ["X Antibody"], match: "nameExact" },
            ],
            raw: "this Digimon has [LadyDevimon]/[X Antibody] in its digivolution cards",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            '[On Play] [When Digivolving] 1 of your opponent\'s Digimon gains "[End of Attack] Delete this Digimon." until the end of their turn.',
          kind: "GrantAuraToOpponents",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          effectText: "[End of Attack] Delete this Digimon.",
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart:
            "Then, if this Digimon has [LadyDevimon]/[X Antibody] in its digivolution cards, you may play 1 [Volée & Zerdrücken] Token (Digimon/Lv.4/Purple/5000 DP/＜Blocker＞/＜Retaliation＞).",
          kind: "PlayToken",
          tokens: ["Volée & Zerdrücken"],
          count: 1,
          payCost: false,
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              { tokens: ["LadyDevimon"], match: "nameExact" },
              { tokens: ["X Antibody"], match: "nameExact" },
            ],
            raw: "this Digimon has [LadyDevimon]/[X Antibody] in its digivolution cards",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  colors: ["Purple"],
                  levelComparison: {
                    op: "lte",
                    value: 4,
                  },
                },
                count: 1,
              },
              from: ["trash"],
              payCost: false,
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
  digivolutionRequirement: [
    {
      names: ["LadyDevimon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX7-058", compiled);
