import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "IceClad",
          raw: "＜Ice Clad＞",
        },
      ],
    },
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
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Suzune Kazuki"],
                  match: "nameExact",
                },
              ],
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
                nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }],
              },
            ],
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Suzune Kazuki"],
                  match: "nameExact",
                },
              ],
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
                nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }],
              },
            ],
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Suzune Kazuki"],
                  match: "nameExact",
                },
              ],
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: { op: "lte", value: 4 },
                nameOrTrait: [{ tokens: ["Ice-Snow"], match: "trait" }],
              },
            ],
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            excludeSelf: true,
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "TrashDigivolution",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  digivolutionCards: "hasAny",
                },
                count: "all",
              },
              amount: 3,
              scope: "acrossDigimon",
            },
            {
              kind: "Restrict",
              target: {
                filter: {
                  digivolutionCards: "none",
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              restriction: "suspend",
              blocksCombatSuspend: true,
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenAnyDigivolves",
          sourceFilter: {
            excludeSelf: true,
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "TrashDigivolution",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  digivolutionCards: "hasAny",
                },
                count: "all",
              },
              amount: 3,
              scope: "acrossDigimon",
            },
            {
              kind: "Restrict",
              target: {
                filter: {
                  digivolutionCards: "none",
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              restriction: "suspend",
              blocksCombatSuspend: true,
              duration: "untilOpponentTurnEnd",
            },
          ],
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
      traits: ["Ice-Snow"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX11-017", compiled);
