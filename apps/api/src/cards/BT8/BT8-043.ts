import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT8-043 Cherubimon
// [Main cost reduction]: "When you would play this card from your hand, you may delete
//   1 of your purple [Cherubimon] to reduce this card's play cost by 8."
// Fix: Replacement must include mode:"reduceCost", amount:8 (prior IR had neither).
//
// [On Play][When Digivolving]: "For each Tamer you have in play, activate the effect below.
//   ・1 of your opponent's Digimon gets <Security Attack -2> until the end of your
//     opponent's next turn."
// Q1730: effect activates separately for each Tamer; you can choose a different target
//   for each activation.
// Q1731: multiple activations are treated as a single timing.
// Fix: use RepeatPerCount with countSource counting owned Tamers, so each activation
//   chooses a separate target Digimon (count:1).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controllerDefault: "mine",
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "mine",
                  colors: ["Purple"],
                  nameOrTrait: [
                    {
                      tokens: ["Cherubimon"],
                      match: "name",
                    },
                  ],
                },
                count: 1,
              },
              optional: true,
            },
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 8,
              raw: "reduce this card's play cost by 8",
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RepeatPerCount",
          countSource: "youHave",
          countFilter: {
            zone: "battleArea",
            controller: "mine",
            kind: ["Tamer"],
          },
          action: {
            kind: "GainKeyword",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
              },
              count: 1,
            },
            keyword: {
              keyword: "SecurityAttack",
              amount: -2,
            },
            duration: "untilOpponentTurnEnd",
          },
          raw: "For each Tamer you have in play, 1 of your opponent's Digimon gets <Security Attack -2> until the end of your opponent's next turn",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RepeatPerCount",
          countSource: "youHave",
          countFilter: {
            zone: "battleArea",
            controller: "mine",
            kind: ["Tamer"],
          },
          action: {
            kind: "GainKeyword",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
              },
              count: 1,
            },
            keyword: {
              keyword: "SecurityAttack",
              amount: -2,
            },
            duration: "untilOpponentTurnEnd",
          },
          raw: "For each Tamer you have in play, 1 of your opponent's Digimon gets <Security Attack -2> until the end of your opponent's next turn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-043", compiled);
