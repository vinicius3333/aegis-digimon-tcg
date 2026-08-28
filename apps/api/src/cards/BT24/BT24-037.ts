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
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -5000,
          duration: "forTheTurn",
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          withoutSuspending: false,
          optional: true,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
        {
          kind: "ModifyDP",
          amount: 5000,
          duration: "forTheTurn",
          target: {
            filter: { controller: "mine", kind: ["Digimon"] },
            count: 1,
            sameTarget: true,
          },
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
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
            count: 1,
          },
          amount: -5000,
          duration: "forTheTurn",
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          withoutSuspending: false,
          optional: true,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
        {
          kind: "ModifyDP",
          amount: 5000,
          duration: "forTheTurn",
          target: {
            filter: { controller: "mine", kind: ["Digimon"] },
            count: 1,
            sameTarget: true,
          },
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          leaveCause: "otherThanYourEffect",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: {
                    op: "lte",
                    value: 4,
                  },
                  or: [
                    {
                      colors: ["Red", "Yellow"],
                    },
                    {
                      nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
                    },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              fromHost: "self",
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          leaveCause: "otherThanYourEffect",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: {
                    op: "lte",
                    value: 4,
                  },
                  or: [
                    {
                      colors: ["Red", "Yellow"],
                    },
                    {
                      nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
                    },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              fromHost: "self",
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
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Yellow", level: 4 },
        { color: "Red", level: 4 },
      ],
    },
  ],
};

registerIrCard("BT24-037", compiled);
