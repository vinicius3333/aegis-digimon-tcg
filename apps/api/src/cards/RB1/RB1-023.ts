// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "AllTurns",
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
          grant: "effects",
          filter: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Gammamon"],
                match: "name",
              },
            ],
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
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
          grant: "effects",
          filter: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Gammamon"],
                match: "name",
              },
            ],
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      names: ["Gammamon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("RB1-023", compiled);
