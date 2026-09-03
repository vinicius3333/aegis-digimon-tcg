import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      timing: "endOfBattle",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              from: ["trash"],
              payCost: false,
            },
          ],
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["ADVENTURE"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["ADVENTURE"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
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
      level: 3,
      names: ["Gabumon"],
      cost: 2,
      isAlternate: true,
    },
    {
      traits: ["ADVENTURE"],
      cost: 2,
      isAlternate: true,
      level: 3,
    },
  ],
};

registerIrCard("BT21-067", compiled);
