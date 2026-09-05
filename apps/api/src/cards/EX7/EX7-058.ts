// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
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
          kind: "PlayToken",
          tokens: ["Volée & Zerdrücken"],
          count: 1,
          payCost: false,
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              { tokens: ["LadyDevimon"], match: "nameExact" },
              { tokens: ["X Antibody"], match: "trait" },
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
          kind: "PlayToken",
          tokens: ["Volée & Zerdrücken"],
          count: 1,
          payCost: false,
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              { tokens: ["LadyDevimon"], match: "nameExact" },
              { tokens: ["X Antibody"], match: "trait" },
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
