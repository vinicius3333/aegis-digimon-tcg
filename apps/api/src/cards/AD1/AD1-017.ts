// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 5,
              raw: "reduce the play cost by 5",
              condition: {
                kind: "youHave",
                filter: {
                  zone: "trash",
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Lucemon", "Witchelny"],
                      match: "text",
                    },
                  ],
                },
                count: 4,
                raw: "you have 4 or more cards with [Lucemon] or [Witchelny] in its text in your trash",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ModifyDP",
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
                position: ["top", "bottom"],
              },
              count: 1,
            },
            raw: "By trashing your top or bottom security card",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
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
                position: ["top", "bottom"],
              },
              count: 1,
            },
            raw: "By trashing your top or bottom security card",
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
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  superlative: "lowestDP",
                },
                count: 1,
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "securityDebuffTarget",
          },
        },
        {
          kind: "GainKeyword",
          target: {
            fromSelectionRef: "securityDebuffTarget",
            filter: {},
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "forTheTurn",
        },
        {
          kind: "ModifyDP",
          target: {
            fromSelectionRef: "securityDebuffTarget",
            filter: {},
            count: 1,
          },
          amount: -3000,
          duration: "untilYourTurnEnd",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("AD1-017", compiled);
